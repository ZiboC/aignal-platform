import Foundation

@MainActor
final class NewsStore: ObservableObject {
    @Published private(set) var items: [NewsItem] = []
    @Published private(set) var loadingError: String?
    @Published private(set) var availableDates: [String] = []
    @Published private(set) var selectedDate: String?

    private let bundle: Bundle
    private let defaults: UserDefaults
    private let feedBaseURL: URL?
    private let urlSession: URLSession

    private let cachedLatestKey = "aignal.cachedLatestFeed"
    private let cachedIndexKey = "aignal.cachedFeedIndex"
    private let cachedDailyPrefix = "aignal.cachedDailyFeed."

    init(
        bundle: Bundle = .main,
        defaults: UserDefaults = .standard,
        feedBaseURL: URL? = NewsStore.defaultFeedBaseURL,
        urlSession: URLSession = .shared
    ) {
        self.bundle = bundle
        self.defaults = defaults
        self.feedBaseURL = feedBaseURL
        self.urlSession = urlSession
        loadSampleNews(from: bundle)
    }

    nonisolated static var defaultFeedBaseURL: URL? {
        if let value = Bundle.main.object(forInfoDictionaryKey: "AIGNAL_FEED_BASE_URL") as? String,
           !value.isEmpty,
           let url = URL(string: value) {
            return url
        }

        return URL(string: "https://ziboc.github.io/aignal-platform")
    }

    func items(in category: NewsCategory?) -> [NewsItem] {
        Self.filter(items, category: category)
    }

    func loadLatestFeed() async {
        guard let feedBaseURL else {
            loadCachedLatestOrSample()
            return
        }

        await loadIndex(from: feedBaseURL)
        await loadFeed(
            from: feedBaseURL.appending(path: "feed/latest.json"),
            cacheKey: cachedLatestKey,
            selectedDate: availableDates.first
        )
    }

    func loadFeed(for date: String) async {
        guard let feedBaseURL else {
            loadCachedDailyOrSample(date: date)
            return
        }

        await loadFeed(
            from: feedBaseURL.appending(path: "feed/daily/\(date).json"),
            cacheKey: cachedDailyPrefix + date,
            selectedDate: date
        )
    }

    private func loadSampleNews(from bundle: Bundle) {
        guard let url = bundle.url(forResource: "news_sample", withExtension: "json") else {
            loadingError = "Missing bundled news_sample.json"
            return
        }

        do {
            let data = try Data(contentsOf: url)
            items = try Self.decodeItems(from: data)
        } catch {
            loadingError = error.localizedDescription
        }
    }

    private func loadIndex(from feedBaseURL: URL) async {
        do {
            let data = try await fetchData(from: feedBaseURL.appending(path: "feed/index.json"))
            let index = try Self.decodeIndex(from: data)
            availableDates = index.dates
            defaults.set(data, forKey: cachedIndexKey)
        } catch {
            if let data = defaults.data(forKey: cachedIndexKey),
               let index = try? Self.decodeIndex(from: data) {
                availableDates = index.dates
            }
        }
    }

    private func loadFeed(from url: URL, cacheKey: String, selectedDate: String?) async {
        do {
            let data = try await fetchData(from: url)
            items = try Self.decodeItems(from: data)
            self.selectedDate = selectedDate
            loadingError = nil
            defaults.set(data, forKey: cacheKey)
        } catch {
            loadCachedFeed(cacheKey: cacheKey, selectedDate: selectedDate, fallbackError: error)
        }
    }

    private func loadCachedFeed(cacheKey: String, selectedDate: String?, fallbackError: Error) {
        if let data = defaults.data(forKey: cacheKey),
           let cachedItems = try? Self.decodeItems(from: data) {
            items = cachedItems
            self.selectedDate = selectedDate
            loadingError = nil
            return
        }

        loadSampleNews(from: bundle)
        loadingError = "Using bundled sample because remote feed could not load: \(fallbackError.localizedDescription)"
    }

    private func loadCachedLatestOrSample() {
        if let data = defaults.data(forKey: cachedLatestKey),
           let cachedItems = try? Self.decodeItems(from: data) {
            items = cachedItems
            loadingError = nil
        } else {
            loadSampleNews(from: bundle)
        }
    }

    private func loadCachedDailyOrSample(date: String) {
        if let data = defaults.data(forKey: cachedDailyPrefix + date),
           let cachedItems = try? Self.decodeItems(from: data) {
            items = cachedItems
            selectedDate = date
            loadingError = nil
        } else {
            loadCachedLatestOrSample()
        }
    }

    private func fetchData(from url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.timeoutInterval = 20
        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    nonisolated static func filter(_ items: [NewsItem], category: NewsCategory?) -> [NewsItem] {
        guard let category else { return items }
        return items.filter { $0.category == category }
    }

    nonisolated static func decodeItems(from data: Data) throws -> [NewsItem] {
        let items = try JSONDecoder.aignalFeedDecoder.decode([NewsItem].self, from: data)
        try validate(items)
        return items
    }

    nonisolated static func decodeIndex(from data: Data) throws -> FeedIndex {
        try JSONDecoder().decode(FeedIndex.self, from: data)
    }

    nonisolated static func validate(_ items: [NewsItem]) throws {
        for item in items where item.readingUrl == nil {
            throw FeedValidationError.missingReadableSource(itemID: item.id)
        }
    }
}

extension JSONDecoder {
    static var aignalFeedDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

extension JSONEncoder {
    static var aignalFeedEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

struct FeedIndex: Codable, Equatable {
    let dates: [String]
}

enum FeedValidationError: LocalizedError, Equatable {
    case missingReadableSource(itemID: String)

    var errorDescription: String? {
        switch self {
        case .missingReadableSource(let itemID):
            return "Feed item \(itemID) is missing source_url and original_url"
        }
    }
}
