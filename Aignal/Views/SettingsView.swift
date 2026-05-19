import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker(languageSettings.localized("settings.language"), selection: $languageSettings.selectedLanguage) {
                        ForEach(AppLanguage.allCases) { language in
                            Text(language.displayName).tag(language)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text(languageSettings.localized("settings.language"))
                } footer: {
                    Text(languageSettings.localized("settings.language_footer"))
                }

                Section {
                    LabeledContent(languageSettings.localized("settings.version"), value: "MVP 1.0")
                    LabeledContent(languageSettings.localized("settings.update"), value: languageSettings.localized("settings.daily"))
                }
            }
            .navigationTitle(languageSettings.localized("settings.title"))
        }
    }
}
