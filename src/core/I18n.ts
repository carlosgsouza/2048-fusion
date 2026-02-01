export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'zh' | 'ru';

export interface Translations {
    [key: string]: string;
}

export class I18n {
    private currentLanguage: Language = 'en';
    private translations: Translations = {};
    private fallbackTranslations: Translations = {};

    private readonly supportedLanguages: Language[] = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ru'];

    private readonly languageNames: Record<Language, string> = {
        'en': 'English',
        'es': 'Español',
        'pt': 'Português',
        'fr': 'Français',
        'de': 'Deutsch',
        'ja': '日本語',
        'zh': '中文',
        'ru': 'Русский'
    };

    constructor() {
        this.detectLanguage();
    }

    async init(): Promise<void> {
        // Load fallback (English) first
        this.fallbackTranslations = await this.loadTranslations('en');

        // Load current language
        if (this.currentLanguage !== 'en') {
            this.translations = await this.loadTranslations(this.currentLanguage);
        } else {
            this.translations = this.fallbackTranslations;
        }
    }

    private detectLanguage(): void {
        // Check URL parameter first (for testing/debugging)
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang') as Language;
        if (langParam && this.supportedLanguages.includes(langParam)) {
            this.currentLanguage = langParam;
            return;
        }

        // Detect from browser
        const browserLang = navigator.language.split('-')[0] as Language;
        if (this.supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
        } else {
            this.currentLanguage = 'en';
        }
    }

    private async loadTranslations(lang: Language): Promise<Translations> {
        try {
            const response = await fetch(`/src/i18n/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}`);
            return await response.json();
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            return {};
        }
    }

    async setLanguage(lang: Language): Promise<void> {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Unsupported language: ${lang}`);
            return;
        }

        this.currentLanguage = lang;

        if (lang === 'en') {
            this.translations = this.fallbackTranslations;
        } else {
            this.translations = await this.loadTranslations(lang);
        }
    }

    t(key: string): string {
        return this.translations[key] || this.fallbackTranslations[key] || key;
    }

    getCurrentLanguage(): Language {
        return this.currentLanguage;
    }

    getSupportedLanguages(): Language[] {
        return this.supportedLanguages;
    }

    getLanguageName(lang: Language): string {
        return this.languageNames[lang] || lang;
    }
}
