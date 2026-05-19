import SwiftUI

struct SavedView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings
    @EnvironmentObject private var savedStore: SavedItemsStore

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                if savedStore.savedItems.isEmpty {
                    ContentUnavailableView(
                        languageSettings.localized("saved.empty_title"),
                        systemImage: "bookmark",
                        description: Text(languageSettings.localized("saved.empty_body"))
                    )
                    .padding(.top, 100)
                } else {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(savedStore.savedItems) { item in
                            NavigationLink {
                                NewsDetailView(item: item)
                            } label: {
                                NewsCardView(item: item)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(languageSettings.localized("saved.title"))
        }
    }
}
