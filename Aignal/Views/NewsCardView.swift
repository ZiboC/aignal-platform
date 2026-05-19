import SwiftUI

struct NewsCardView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings
    @EnvironmentObject private var savedStore: SavedItemsStore

    let item: NewsItem
    private let cardHeight: CGFloat = 356
    private let visualHeight: CGFloat = 132

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            NewsVisualView(imageName: item.imageName, imageURL: item.imageUrl, category: item.category)
                .frame(height: visualHeight)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 8) {
                Text(item.title(for: languageSettings.selectedLanguage))
                    .font(.headline)
                    .lineLimit(3)
                    .foregroundStyle(.primary)

                Text(item.summary(for: languageSettings.selectedLanguage))
                    .font(.caption)
                    .lineLimit(3)
                    .foregroundStyle(.secondary)

                Spacer(minLength: 0)

                HStack(spacing: 6) {
                    Image(systemName: item.category.symbolName())
                    Text(item.category.title(for: languageSettings.selectedLanguage))
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Button {
                        savedStore.toggle(item)
                    } label: {
                        Image(systemName: savedStore.contains(item) ? "bookmark.fill" : "bookmark")
                            .foregroundStyle(savedStore.contains(item) ? Color.accentColor : .secondary)
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(languageSettings.localized("detail.save"))
                }
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 10)
            .padding(.bottom, 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(height: cardHeight)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
