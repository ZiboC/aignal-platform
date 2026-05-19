import SwiftUI

struct NewsDetailView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings
    @EnvironmentObject private var savedStore: SavedItemsStore

    let item: NewsItem

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                NewsVisualView(imageName: item.imageName, imageURL: item.imageUrl, category: item.category)
                    .frame(height: 260)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 12) {
                    Label(
                        item.category.title(for: languageSettings.selectedLanguage),
                        systemImage: item.category.symbolName()
                    )
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.accentColor)

                    Text(item.title(for: languageSettings.selectedLanguage))
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    Text(formattedDate)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                detailSection(title: languageSettings.localized("detail.summary"), text: item.summary(for: languageSettings.selectedLanguage))
                detailSection(title: languageSettings.localized("detail.why"), text: item.whyItMatters(for: languageSettings.selectedLanguage))

                tagCloud

                sourceRow
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(languageSettings.localized("detail.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    savedStore.toggle(item)
                } label: {
                    Image(systemName: savedStore.contains(item) ? "bookmark.fill" : "bookmark")
                }
                .accessibilityLabel(languageSettings.localized("detail.save"))
            }
        }
    }

    private func detailSection(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(text)
                .font(.body)
                .lineSpacing(4)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var tagCloud: some View {
        FlowLayout(spacing: 8) {
            ForEach(item.tags, id: \.self) { tag in
                Text("#\(languageSettings.localizedTag(tag))")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color(.tertiarySystemGroupedBackground))
                    .clipShape(Capsule())
            }
        }
    }

    @ViewBuilder
    private var sourceRow: some View {
        if let readingURL = item.readingUrl {
            Link(destination: readingURL) {
                Label(item.sourceName, systemImage: "link")
                    .font(.subheadline.weight(.semibold))
            }
        } else {
            Label(item.sourceName, systemImage: "link.badge.plus")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    private var formattedDate: String {
        languageSettings.formattedDate(item.publishedAt)
    }
}
