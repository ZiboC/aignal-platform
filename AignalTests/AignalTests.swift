import XCTest
@testable import Aignal

final class AignalTests: XCTestCase {
    func testNewsJSONDecoding() throws {
        let json = """
        [
          {
            "id": "item-1",
            "category": "coding_ai",
            "title_zh": "中文标题",
            "title_en": "English title",
            "summary_zh": "中文摘要",
            "summary_en": "English summary",
            "why_it_matters_zh": "重要原因",
            "why_it_matters_en": "Why it matters",
            "source_name": "Source",
            "source_url": "https://example.com",
            "original_url": "https://example.com/original",
            "published_at": "2026-05-18T08:30:00Z",
            "image_name": "sample",
            "image_url": "https://example.com/image.png",
            "image_prompt": "Editorial AI news card",
            "confidence": 0.92,
            "tags": ["coding", "ai"]
          }
        ]
        """

        let items = try NewsStore.decodeItems(from: Data(json.utf8))

        XCTAssertEqual(items.count, 1)
        XCTAssertEqual(items[0].category, .codingAI)
        XCTAssertEqual(items[0].title(for: .chinese), "中文标题")
        XCTAssertEqual(items[0].title(for: .english), "English title")
        XCTAssertEqual(items[0].sourceUrl?.absoluteString, "https://example.com")
        XCTAssertEqual(items[0].originalUrl?.absoluteString, "https://example.com/original")
        XCTAssertEqual(items[0].readingUrl?.absoluteString, "https://example.com/original")
        XCTAssertEqual(items[0].imageUrl?.absoluteString, "https://example.com/image.png")
        XCTAssertEqual(items[0].imagePrompt, "Editorial AI news card")
        XCTAssertEqual(items[0].confidence, 0.92)
    }

    func testNewsJSONDecodingAcceptsFractionalISODate() throws {
        let json = """
        [
          {
            "id": "item-fractional-date",
            "category": "models_products",
            "title_zh": "中文标题",
            "title_en": "English title",
            "summary_zh": "中文摘要",
            "summary_en": "English summary",
            "why_it_matters_zh": "重要原因",
            "why_it_matters_en": "Why it matters",
            "source_name": "Source",
            "source_url": "https://example.com",
            "original_url": "https://example.com/original",
            "published_at": "2026-05-20T00:00:00.000Z",
            "image_name": "sample",
            "image_url": null,
            "tags": ["models", "ai"]
          }
        ]
        """

        let items = try NewsStore.decodeItems(from: Data(json.utf8))

        XCTAssertEqual(items.count, 1)
        XCTAssertEqual(items[0].id, "item-fractional-date")
    }

    func testFeedValidationRejectsItemsWithoutReadableSource() {
        let json = """
        [
          {
            "id": "item-1",
            "category": "coding_ai",
            "title_zh": "中文标题",
            "title_en": "English title",
            "summary_zh": "中文摘要",
            "summary_en": "English summary",
            "why_it_matters_zh": "重要原因",
            "why_it_matters_en": "Why it matters",
            "source_name": "Source",
            "source_url": null,
            "original_url": null,
            "published_at": "2026-05-18T08:30:00Z",
            "image_name": "sample",
            "tags": ["coding", "ai"]
          }
        ]
        """

        XCTAssertThrowsError(try NewsStore.decodeItems(from: Data(json.utf8)))
    }

    func testFeedIndexDecoding() throws {
        let json = #"{"dates":["2026-05-19","2026-05-18"]}"#
        let index = try NewsStore.decodeIndex(from: Data(json.utf8))

        XCTAssertEqual(index.dates, ["2026-05-19", "2026-05-18"])
    }

    @MainActor
    func testRemoteLatestFeedLoadsIndexAndItems() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "AignalTests.RemoteFeed"))
        defaults.removePersistentDomain(forName: "AignalTests.RemoteFeed")
        MockURLProtocol.responses = [
            "https://feeds.example.com/feed/index.json": (200, Data(#"{"dates":["2026-05-19","2026-05-18"]}"#.utf8)),
            "https://feeds.example.com/feed/latest.json": (200, sampleFeedJSON(id: "remote-item"))
        ]
        let store = NewsStore(
            defaults: defaults,
            feedBaseURL: try XCTUnwrap(URL(string: "https://feeds.example.com")),
            urlSession: makeMockSession()
        )

        await store.loadLatestFeed()

        XCTAssertEqual(store.availableDates, ["2026-05-19", "2026-05-18"])
        XCTAssertEqual(store.selectedDate, "2026-05-19")
        XCTAssertEqual(store.items.map(\.id), ["remote-item"])
    }

    @MainActor
    func testRemoteDailyFeedFallsBackToCachedFeed() async throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "AignalTests.CachedDailyFeed"))
        defaults.removePersistentDomain(forName: "AignalTests.CachedDailyFeed")
        defaults.set(sampleFeedJSON(id: "cached-item"), forKey: "aignal.cachedDailyFeed.2026-05-19")
        MockURLProtocol.responses = [
            "https://feeds.example.com/feed/daily/2026-05-19.json": (500, Data())
        ]
        let store = NewsStore(
            defaults: defaults,
            feedBaseURL: try XCTUnwrap(URL(string: "https://feeds.example.com")),
            urlSession: makeMockSession()
        )

        await store.loadFeed(for: "2026-05-19")

        XCTAssertEqual(store.selectedDate, "2026-05-19")
        XCTAssertEqual(store.items.map(\.id), ["cached-item"])
        XCTAssertNil(store.loadingError)
    }

    func testCategoryFiltering() throws {
        let codingItem = makeItem(id: "coding", category: .codingAI)
        let imageItem = makeItem(id: "image", category: .imageAI)
        let items = [codingItem, imageItem]

        XCTAssertEqual(NewsStore.filter(items, category: nil).count, 2)
        XCTAssertEqual(NewsStore.filter(items, category: .codingAI), [codingItem])
        XCTAssertEqual(NewsStore.filter(items, category: .videoAI), [])
    }

    func testLanguageSelectionPersists() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "AignalTests.LanguageSelection"))
        defaults.removePersistentDomain(forName: "AignalTests.LanguageSelection")

        let settings = LanguageSettings(defaults: defaults)
        XCTAssertEqual(settings.selectedLanguage, .chinese)

        settings.selectedLanguage = .english

        let reloadedSettings = LanguageSettings(defaults: defaults)
        XCTAssertEqual(reloadedSettings.selectedLanguage, .english)
    }

    func testSavedItemsTogglePersists() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "AignalTests.SavedItems"))
        defaults.removePersistentDomain(forName: "AignalTests.SavedItems")
        let item = makeItem(id: "saved-item", category: .toolsApps)
        let store = SavedItemsStore(defaults: defaults)

        XCTAssertFalse(store.contains(item))

        store.toggle(item)
        XCTAssertTrue(store.contains(item))
        XCTAssertTrue(SavedItemsStore(defaults: defaults).contains(item))

        store.toggle(item)
        XCTAssertFalse(store.contains(item))
    }

    func testGlobalLanguageHelpersUseSelectedLanguage() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "AignalTests.GlobalLanguage"))
        defaults.removePersistentDomain(forName: "AignalTests.GlobalLanguage")
        let settings = LanguageSettings(defaults: defaults)

        settings.selectedLanguage = .chinese
        XCTAssertEqual(settings.locale.identifier, "zh-Hans")
        XCTAssertEqual(settings.localizedTag("developer-tools"), "开发工具")
        XCTAssertTrue(settings.formattedDate(Date(timeIntervalSince1970: 1_800_000_000)).contains("2027"))

        settings.selectedLanguage = .english
        XCTAssertEqual(settings.locale.identifier, "en")
        XCTAssertEqual(settings.localizedTag("developer-tools"), "developer-tools")
        XCTAssertEqual(settings.localized("tab.home"), "Today")
        XCTAssertEqual(settings.localized("settings.title"), "Settings")
    }

    private func makeItem(id: String, category: NewsCategory) -> NewsItem {
        NewsItem(
            id: id,
            category: category,
            titleZh: "标题",
            titleEn: "Title",
            summaryZh: "摘要",
            summaryEn: "Summary",
            whyItMattersZh: "原因",
            whyItMattersEn: "Reason",
            sourceName: "Source",
            sourceUrl: URL(string: "https://example.com"),
            originalUrl: URL(string: "https://example.com/original"),
            publishedAt: Date(timeIntervalSince1970: 0),
            imageName: "image",
            imageUrl: URL(string: "https://example.com/image.png"),
            imagePrompt: "Prompt",
            confidence: 0.9,
            tags: ["tag"]
        )
    }

    private func sampleFeedJSON(id: String) -> Data {
        Data("""
        [
          {
            "id": "\(id)",
            "category": "coding_ai",
            "title_zh": "中文标题",
            "title_en": "English title",
            "summary_zh": "中文摘要",
            "summary_en": "English summary",
            "why_it_matters_zh": "重要原因",
            "why_it_matters_en": "Why it matters",
            "source_name": "Source",
            "source_url": "https://example.com/source",
            "original_url": "https://example.com/original",
            "published_at": "2026-05-19T08:30:00Z",
            "image_name": "sample",
            "image_url": "https://example.com/image.png",
            "tags": ["coding", "ai"]
          }
        ]
        """.utf8)
    }

    private func makeMockSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        return URLSession(configuration: configuration)
    }
}

private final class MockURLProtocol: URLProtocol {
    static var responses: [String: (statusCode: Int, data: Data)] = [:]

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let url = request.url?.absoluteString,
              let response = Self.responses[url],
              let httpResponse = HTTPURLResponse(
                url: request.url!,
                statusCode: response.statusCode,
                httpVersion: nil,
                headerFields: nil
              ) else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }

        client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: response.data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
