import Foundation

enum AppLanguage: String, CaseIterable, Identifiable {
    case chinese = "zh"
    case english = "en"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .chinese: return "中文"
        case .english: return "English"
        }
    }

    var localeIdentifier: String {
        switch self {
        case .chinese: return "zh-Hans"
        case .english: return "en"
        }
    }

    func localizedTag(_ tag: String) -> String {
        switch self {
        case .english:
            return tag
        case .chinese:
            return Self.chineseTags[tag] ?? tag
        }
    }

    private static let chineseTags: [String: String] = [
        "agents": "智能体",
        "ai": "AI",
        "assistant": "助手",
        "automation": "自动化",
        "brand": "品牌",
        "business": "商业",
        "coding": "编程",
        "commerce": "电商",
        "creative": "创意",
        "design": "设计",
        "developer-tools": "开发工具",
        "edge-ai": "端侧 AI",
        "enterprise": "企业",
        "evaluation": "评测",
        "image": "图片",
        "inference": "推理",
        "investment": "投资",
        "models": "模型",
        "multimodal": "多模态",
        "product": "产品",
        "productivity": "效率",
        "quality": "质量",
        "research": "研究",
        "testing": "测试",
        "tools": "工具",
        "video": "视频",
        "workflow": "工作流"
    ]
}
