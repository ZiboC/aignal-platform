import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings
    @StateObject private var newsStore = NewsStore()
    @State private var selectedCategory: NewsCategory?
    @State private var didLoadRemoteFeed = false

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    archivePicker
                    categoryPicker
                    feedContent
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .task {
                guard !didLoadRemoteFeed else { return }
                didLoadRemoteFeed = true
                await newsStore.loadLatestFeed()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(languageSettings.localized("home.title"))
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)

            Text(languageSettings.localized("home.subtitle"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 20)
    }

    @ViewBuilder
    private var archivePicker: some View {
        if !newsStore.availableDates.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(newsStore.availableDates, id: \.self) { date in
                        Button {
                            Task {
                                await newsStore.loadFeed(for: date)
                            }
                        } label: {
                            Text(dateLabel(for: date))
                                .font(.caption.weight(.semibold))
                                .lineLimit(1)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .foregroundStyle(newsStore.selectedDate == date ? .white : .primary)
                                .background(newsStore.selectedDate == date ? Color.accentColor : Color(.secondarySystemGroupedBackground))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var categoryPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                CategoryChip(
                    title: languageSettings.localized("category.all"),
                    symbolName: "square.grid.2x2",
                    isSelected: selectedCategory == nil
                ) {
                    withAnimation(.snappy) { selectedCategory = nil }
                }

                ForEach(NewsCategory.allCases) { category in
                    CategoryChip(
                        title: category.title(for: languageSettings.selectedLanguage),
                        symbolName: category.symbolName(),
                        isSelected: selectedCategory == category
                    ) {
                        withAnimation(.snappy) { selectedCategory = category }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    @ViewBuilder
    private var feedContent: some View {
        if let error = newsStore.loadingError {
            ContentUnavailableView(
                languageSettings.localized("empty.load_failed"),
                systemImage: "exclamationmark.triangle",
                description: Text(error)
            )
        } else {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(newsStore.items(in: selectedCategory)) { item in
                    NavigationLink {
                        NewsDetailView(item: item)
                    } label: {
                        NewsCardView(item: item)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func dateLabel(for date: String) -> String {
        guard let firstDate = newsStore.availableDates.first else { return date }
        if date == firstDate {
            return languageSettings.localized("feed.today")
        }
        return date
    }
}

private struct CategoryChip: View {
    let title: String
    let symbolName: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbolName)
                .font(.footnote.weight(.semibold))
                .lineLimit(1)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .foregroundStyle(isSelected ? .white : .primary)
                .background(isSelected ? Color.accentColor : Color(.secondarySystemGroupedBackground))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HomeView()
        .environmentObject(LanguageSettings())
        .environmentObject(SavedItemsStore())
}
