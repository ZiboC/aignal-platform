import SwiftUI

struct NewsVisualView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings

    let imageName: String
    let imageURL: URL?
    let category: NewsCategory

    init(imageName: String, imageURL: URL? = nil, category: NewsCategory) {
        self.imageName = imageName
        self.imageURL = imageURL
        self.category = category
    }

    var body: some View {
        if let imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    localOrFallbackVisual
                case .empty:
                    fallbackVisual
                        .overlay {
                            ProgressView()
                                .tint(.white)
                        }
                @unknown default:
                    fallbackVisual
                }
            }
        } else {
            localOrFallbackVisual
        }
    }

    @ViewBuilder
    private var localOrFallbackVisual: some View {
        if UIImage(named: imageName) != nil {
            Image(imageName)
                .resizable()
                .scaledToFill()
        } else {
            fallbackVisual
        }
    }

    private var fallbackVisual: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Image(systemName: category.symbolName())
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(.white.opacity(0.92))
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            Text(category.title(for: languageSettings.selectedLanguage).uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white.opacity(0.82))
                .lineLimit(1)
                .padding(10)
        }
    }

    private var gradientColors: [Color] {
        switch category {
        case .codingAI:
            return [.indigo, .cyan]
        case .imageAI:
            return [.pink, .orange]
        case .videoAI:
            return [.purple, .blue]
        case .researchPapers:
            return [.mint, .teal]
        case .modelsProducts:
            return [.blue, .green]
        case .businessInvestment:
            return [.orange, .red]
        case .toolsApps:
            return [.green, .yellow]
        }
    }
}
