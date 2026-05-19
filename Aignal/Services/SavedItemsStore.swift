import Foundation

final class SavedItemsStore: ObservableObject {
    private let defaults: UserDefaults
    private let storageKey = "aignal.savedItems.v2"
    @Published private(set) var savedItems: [NewsItem] {
        didSet {
            if let data = try? JSONEncoder.aignalFeedEncoder.encode(savedItems) {
                defaults.set(data, forKey: storageKey)
            }
        }
    }

    var savedIDs: Set<String> {
        Set(savedItems.map(\.id))
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let data = defaults.data(forKey: storageKey),
           let items = try? JSONDecoder.aignalFeedDecoder.decode([NewsItem].self, from: data) {
            self.savedItems = items
        } else {
            self.savedItems = []
        }
    }

    func contains(_ item: NewsItem) -> Bool {
        savedIDs.contains(item.id)
    }

    func toggle(_ item: NewsItem) {
        if let index = savedItems.firstIndex(where: { $0.id == item.id }) {
            savedItems.remove(at: index)
        } else {
            savedItems.insert(item, at: 0)
        }
    }
}
