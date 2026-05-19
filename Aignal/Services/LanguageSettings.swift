import Foundation

final class LanguageSettings: ObservableObject {
    private let defaults: UserDefaults
    private let storageKey = "aignal.selectedLanguage"

    @Published var selectedLanguage: AppLanguage {
        didSet {
            defaults.set(selectedLanguage.rawValue, forKey: storageKey)
        }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let storedValue = defaults.string(forKey: storageKey)
        self.selectedLanguage = AppLanguage(rawValue: storedValue ?? "") ?? .chinese
    }

    var locale: Locale {
        Locale(identifier: selectedLanguage.localeIdentifier)
    }

    func localized(_ key: String) -> String {
        localizationBundle.localizedString(
            forKey: key,
            value: key,
            table: "Localizable"
        )
    }

    func localizedTag(_ tag: String) -> String {
        selectedLanguage.localizedTag(tag)
    }

    func formattedDate(_ date: Date) -> String {
        date.formatted(
            .dateTime
                .locale(locale)
                .year()
                .month(.abbreviated)
                .day()
        )
    }

    private var localizationBundle: Bundle {
        guard
            let path = Bundle.main.path(
                forResource: selectedLanguage.localeIdentifier,
                ofType: "lproj"
            ),
            let bundle = Bundle(path: path)
        else {
            return .main
        }

        return bundle
    }
}
