# HArvest

Securely share and control your Home Assistant smart home devices on any HTML or WordPress page.

<!-- SCREENSHOT: hero-screenshot.png - panel overview + a widget card embedded on a website -->

## What it does

HArvest creates a secure bridge between your Home Assistant instance and any webpage. You create a *widget token* in the HArvest panel, pick the entities you want to expose, paste a snippet into your page, and you're done. Visitors see live entity states updated in real time via WebSocket. Where you allow it, they can control things too - toggle lights, adjust temperature, play media, and more.

Every widget is independently scoped. One token for the living room lights on your family page. A different token with read-only access to your solar stats on your blog. Each token has its own access rules, origin restrictions, expiry, and activity log.

## Features

- **14 dedicated renderers** - purpose-built cards for lights, fans, climate, media players, sensors, covers, timers, and more
- **Companion entities** - show a motion sensor or lock status inside another card
- **Real-time updates** - WebSocket push, no polling, no refresh
- **Scoped token access** - each widget token exposes only the entities you choose
- **Lightweight** - Optimized JavaScript ensures minimal network bandwidth use
- **WordPress plugin** - shortcode-based embedding, no HTML required
- **Custom themes** - full CSS variable control, shareable JSON theme files
- **Renderer packs** - replace the default card UI entirely with your own design
- **Security controls** - origin restrictions, HMAC signing, IP allowlists, time schedules, instant revocation
- **Activity logging** - all auth events and commands logged with CSV export
- **HA panel** - full management UI built into your HA sidebar

## Requirements

- Home Assistant 2024.1 or later
- Your HA instance must be reachable from the internet over HTTPS
- HACS (for installation)

## Installation

HArvest installs as a custom HACS repository.

**Step 1 - Add the repository to HACS**

1. Open **HACS** in your Home Assistant sidebar
2. Click the three-dot menu in the top-right corner and choose **Custom repositories**
3. Paste `https://github.com/sfox38/harvest` as the repository URL
4. Set the category to **Integration** and click **Add**

**Step 2 - Install the integration**

1. Search for **HArvest** in the HACS integration list and click it
2. Click **Download** and confirm
3. Restart Home Assistant

**Step 3 - Add the integration**

1. Go to **Settings > Devices and Services > Add Integration**
2. Search for **HArvest** and select it
3. HArvest appears in your HA sidebar

That's it. Open the HArvest panel and click **+ Create Widget** to set up your first widget.

## Quick start

Once HArvest is installed, embedding a light card is three lines of HTML:

```html
<script src="/harvest.min.js"></script>
<script>HArvest.config({ haUrl: "https://ha.example.com", token: "hwt_..." })</script>
<hrv-card entity="light.bedroom_main"></hrv-card>
```

For WordPress, install the HArvest WordPress plugin and use a shortcode:

```code
[harvest token="hwt_..." entity="light.bedroom_main"]
```

The HArvest wizard generates the exact snippet you need - just paste and go.

## Documentation

Full documentation is at [sfox38.github.io/harvest](https://sfox38.github.io/harvest)

| Page | What's covered |
|------|----------------|
| [Installation](https://sfox38.github.io/harvest/installation.html) | HACS setup, first widget, network requirements |
| [Panel guide](https://sfox38.github.io/harvest/panel.html) | Tokens, wizard, themes, settings, activity log |
| [Widget reference](https://sfox38.github.io/harvest/widgets.html) | HTML attributes, JavaScript API, companions, code modes |
| [WordPress](https://sfox38.github.io/harvest/wordpress.html) | Plugin install, shortcodes, settings, CSP |
| [Theming](https://sfox38.github.io/harvest/theming.html) | CSS variables, themes, renderer packs |
| [Entities](https://sfox38.github.io/harvest/entities.html) | Supported domains, commands, Tier 1/2/3 |
| [Security](https://sfox38.github.io/harvest/security.html) | Token hardening, HMAC, origin rules, schedules |
| [Reference](https://sfox38.github.io/harvest/reference.html) | Every option in one place |

