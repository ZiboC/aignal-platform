import Foundation

enum NewsCategory: String, CaseIterable, Codable, Identifiable {
    case codingAI = "coding_ai"
    case imageAI = "image_ai"
    case videoAI = "video_ai"
    case researchPapers = "research_papers"
    case modelsProducts = "models_products"
    case businessInvestment = "business_investment"
    case toolsApps = "tools_apps"

    var id: String { rawValue }

    func title(for language: AppLanguage) -> String {
        switch (self, language) {
        case (.codingAI, .chinese): return "写代码 AI"
        case (.codingAI, .english): return "Coding AI"
        case (.imageAI, .chinese): return "图片 AI"
        case (.imageAI, .english): return "Image AI"
        case (.videoAI, .chinese): return "视频 AI"
        case (.videoAI, .english): return "Video AI"
        case (.researchPapers, .chinese): return "研究论文"
        case (.researchPapers, .english): return "Research"
        case (.modelsProducts, .chinese): return "模型/产品"
        case (.modelsProducts, .english): return "Models"
        case (.businessInvestment, .chinese): return "产业/投资"
        case (.businessInvestment, .english): return "Business"
        case (.toolsApps, .chinese): return "工具应用"
        case (.toolsApps, .english): return "Tools"
        }
    }

    func symbolName() -> String {
        switch self {
        case .codingAI: return "chevron.left.forwardslash.chevron.right"
        case .imageAI: return "photo.on.rectangle.angled"
        case .videoAI: return "video"
        case .researchPapers: return "doc.text.magnifyingglass"
        case .modelsProducts: return "cube.transparent"
        case .businessInvestment: return "chart.line.uptrend.xyaxis"
        case .toolsApps: return "wand.and.stars"
        }
    }
}
