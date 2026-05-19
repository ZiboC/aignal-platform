import SwiftUI

struct RootView: View {
    @EnvironmentObject private var languageSettings: LanguageSettings

    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label(languageSettings.localized("tab.home"), systemImage: "sparkles")
                }

            SavedView()
                .tabItem {
                    Label(languageSettings.localized("tab.saved"), systemImage: "bookmark")
                }

            SettingsView()
                .tabItem {
                    Label(languageSettings.localized("tab.settings"), systemImage: "gearshape")
                }
        }
    }
}

#Preview {
    RootView()
        .environmentObject(LanguageSettings())
        .environmentObject(SavedItemsStore())
}
