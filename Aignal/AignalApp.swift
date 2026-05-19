import SwiftUI

@main
struct AignalApp: App {
    @StateObject private var languageSettings = LanguageSettings()
    @StateObject private var savedStore = SavedItemsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(languageSettings)
                .environmentObject(savedStore)
                .environment(\.locale, languageSettings.locale)
        }
    }
}
