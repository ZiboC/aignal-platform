import Foundation

struct NewsItem: Identifiable, Codable, Equatable {
    let id: String
    let category: NewsCategory
    let titleZh: String
    let titleEn: String
    let summaryZh: String
    let summaryEn: String
    let whyItMattersZh: String
    let whyItMattersEn: String
    let sourceName: String
    let sourceUrl: URL?
    let originalUrl: URL?
    let publishedAt: Date
    let imageName: String
    let imageUrl: URL?
    let imagePrompt: String?
    let confidence: Double?
    let tags: [String]

    var readingUrl: URL? {
        originalUrl ?? sourceUrl
    }

    func title(for language: AppLanguage) -> String {
        language == .chinese ? titleZh : titleEn
    }

    func summary(for language: AppLanguage) -> String {
        language == .chinese ? summaryZh : summaryEn
    }

    func whyItMatters(for language: AppLanguage) -> String {
        language == .chinese ? whyItMattersZh : whyItMattersEn
    }
}
