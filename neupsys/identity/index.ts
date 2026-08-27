/*
::neup.documentation::neupsys-identity
::title Neup System Identity

Provides the application identity used by the application shell.

::public

Use the named getters for application metadata. Logo getters accept `main`
or one of the supported platform logo names; omitting the logo name returns
the main logo.

::public end

::private

This module contains configuration access only. It has no request-bound or
database dependencies and is safe to import from server and client modules.

::private end

::end
*/

import { getEnvVariable } from '../../core/helpers/env';

const identityConfig = {
    name: 'Neup.Analytics',
    id: 'neup.analytics',
    basePath: getEnvVariable('APP_BASEPATH', true) ?? '/analytics',
    description: 'Neup.Analytics is a data analysis and visualization platform.',
    logo: {
        main: '/cloud/logo.svg',
        favicon: '/cloud/favicon.ico',
        'apple-touch-icon': '/cloud/apple-touch-icon.png',
        'android-chrome-192x192': '/cloud/android-chrome-192x192.png',
        'android-chrome-512x512': '/cloud/android-chrome-512x512.png',
        'mstile-150x150': '/cloud/mstile-150x150.png',
        'safari-pinned-tab': '/cloud/safari-pinned-tab.svg',
    },
    version: '1.0.0',
} as const;

export const identity = identityConfig;

export type AppLogoName = keyof typeof identityConfig.logo;

export function getName(): string {
    return identityConfig.name;
}

export function getId(): string {
    return identityConfig.id;
}

export function getBasePath(): string {
    return identityConfig.basePath;
}

export function getDescription(): string {
    return identityConfig.description;
}

export function getAppLogo(logo: AppLogoName = 'main'): string {
    return identityConfig.logo[logo];
}

export function getVersion(): string {
    return identityConfig.version;
}

export const name = getName();
export const id = getId();
export const basePath = getBasePath();
export const description = getDescription();
export const version = getVersion();

export function appLogo(logo?: AppLogoName): string {
    return getAppLogo(logo);
}
