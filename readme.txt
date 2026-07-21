=== StudioMeta Voice AI ===
Contributors: studiometa, stdmeta
Donate link: https://studiometa.io/
Tags: chatbot, live chat, voice assistant, ai chatbot, chat widget
Requires at least: 6.0
Tested up to: 7.0
Stable tag: 1.3.75
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI voice & chat widget for your site. Free trial included: 30 voice minutes + 100 chat messages, no credit card required.

== Description ==

**StudioMeta Voice AI** adds a natural, conversational voice and chat assistant to your WordPress site. Visitors can have a real spoken conversation with an AI agent trained on your content, or chat by typing — all from a small floating widget.

The assistant understands context, answers in multiple languages, and can be customized to match your brand.

**Every install includes a free trial — no signup, no credit card required.** Click "Start Free Trial" in the admin panel to activate 30 voice minutes and 100 chat messages before deciding on a paid plan.

= Key features =

* **Voice conversations** — visitors talk to your AI agent, the agent talks back (real-time, streaming)
* **Text chat** — classic chat widget for visitors who prefer typing
* **Multi-language** — English, Persian (فارسی), Arabic, French, Spanish, and more
* **Knowledge base import** — auto-crawl your site to train the agent on your content
* **Customizable widget** — color, position (bottom-left/right), style (FAB or pill)
* **Suggested questions** — chips that prompt visitors with common questions
* **Agent customization** — name, voice, response style, system prompt, timezone
* **Custom tools** — connect your agent to external APIs via webhooks (n8n, Make, Zapier)
* **Usage dashboard** — see voice minutes used, sessions, and remaining quota
* **Smart fallback** — when one quota is exhausted, the other stays available

= How the trial works =

1. Activate the plugin, then click **Start Free Trial** in the admin panel
2. Use 30 voice minutes and 100 chat messages on real visitor conversations
3. When the voice quota is exhausted, the chat widget keeps working (and vice versa)
4. When both are exhausted, the widget shows an upgrade button linking to our pricing page

= Upgrading to a paid plan =

If you want unlimited or higher quotas, visit [studiometa.io/pricing](https://studiometa.io/pricing/). After purchase, your widget reactivates automatically within 5 minutes — no need to copy and paste a license key.

== External services ==

**This plugin connects to external services provided by StudioMeta to function.** This is required because the plugin is an interface to a hosted AI assistant. The following services are used:

= 1. StudioMeta Voice AI API (api2.studiometa.io) =

**What it does:** Hosts the AI agent. Handles license validation, quota tracking, knowledge base storage, agent configuration, voice/chat session orchestration, and dashboard analytics.

**When it is contacted:**

* On plugin activation: to issue a free trial license (sends site URL, admin email, business name, site fingerprint, WordPress version, plugin version, language preference)
* When you save settings or agent configuration: to sync your changes to the hosted agent
* When you click "Import KB from Website": to crawl your public pages and build a knowledge base
* When you click "Optimize with AI": to improve your system prompt
* When the admin Dashboard loads: to fetch usage statistics
* Every 5 minutes (cached): to check current quota status (decides whether the widget shows voice, chat, both, or an upgrade button)
* When a visitor uses the voice or chat widget: a WebSocket connection is opened to `wss://api2.studiometa.io/voice` to stream audio and messages

**Data sent:** site URL, admin email, business name, your custom agent configuration (name, voice, system prompt, knowledge base text, suggested questions, custom tools), and during sessions: visitor audio and chat messages (processed only for the duration of the conversation).

**Data NOT sent:** WordPress user passwords, post content (unless you explicitly import it via "Import KB"), visitor IP addresses, visitor names or accounts.

* Service homepage: [https://studiometa.io](https://studiometa.io)
* Terms of Service: [https://studiometa.io/terms/](https://studiometa.io/terms/)
* Privacy Policy: [https://studiometa.io/privacy-policy-2/](https://studiometa.io/privacy-policy-2/)

= 2. StudioMeta Workflow Webhooks (n8n.studiometa.io) =

**What it does:** Sends transactional emails (welcome email on activation, license key email after purchase, usage alerts at 80% and 100%, monthly usage report).

**When it is contacted:**

* Once on plugin activation: to trigger the welcome email
* When usage thresholds are crossed (server-side): to trigger usage alert emails

**Data sent:** admin email, site URL, business name, current plan, usage percentages.

* Service homepage: [https://studiometa.io](https://studiometa.io)
* Terms of Service: [https://studiometa.io/terms/](https://studiometa.io/terms/)
* Privacy Policy: [https://studiometa.io/privacy-policy-2/](https://studiometa.io/privacy-policy-2/)

= 3. HubSpot (api.hubapi.com) — optional, only if you connect it =

**What it does:** Syncs leads captured by the voice/chat widget (name, email, phone, notes) into your own HubSpot CRM as contacts.

**When it is contacted:** Only if you explicitly connect HubSpot under **Voice AI → Integrations** by entering your own HubSpot Private App Token. If you never connect it, the plugin never contacts HubSpot.

* When you click "Connect": one test request to `api.hubapi.com` to verify your token
* When the widget captures a lead: the lead's name, email, phone, and notes are sent to `api.hubapi.com` to create/update a contact in **your** HubSpot account

**Data sent:** your HubSpot Private App Token (stored in your WordPress database, sent only to HubSpot), and captured lead fields (name, email, phone, notes).

* Service homepage: [https://www.hubspot.com](https://www.hubspot.com)
* Terms of Service: [https://legal.hubspot.com/terms-of-service](https://legal.hubspot.com/terms-of-service)
* Privacy Policy: [https://legal.hubspot.com/privacy-policy](https://legal.hubspot.com/privacy-policy)

= 4. Google Gemini Live (indirectly, via api2.studiometa.io) =

The AI capabilities are powered by Google's Gemini Live API. The plugin does **not** contact Google directly — all requests go through `api2.studiometa.io`, which forwards them to Google. You do not need a Google account or API key.

* Google Gemini Terms: [https://ai.google.dev/terms](https://ai.google.dev/terms)
* Google Privacy Policy: [https://policies.google.com/privacy](https://policies.google.com/privacy)

= How to opt out =

If you do not want the plugin to contact these services, simply deactivate and uninstall the plugin. The plugin cannot function without the hosted services because the AI assistant runs on our infrastructure (similar to how an Akismet plugin needs the Akismet service, or a Mailchimp plugin needs Mailchimp).

== Installation ==

1. Upload the `studiometa-voice-ai` folder to `/wp-content/plugins/`, OR install through the WordPress plugin browser
2. Activate the plugin through the **Plugins** menu in WordPress
3. Click **Start Free Trial** in the admin notice to activate your free trial — you'll see the **Voice AI** menu item in your WordPress admin sidebar
4. Click **Voice AI → My Agent** to customize your assistant's name, voice, and knowledge base
5. The widget appears as a floating button on every page of your site (or use the shortcode `[smva_widget]` to place it manually)

== Frequently Asked Questions ==

= Do I need to create an account? =

No. Click **Start Free Trial** in the admin panel after activation. No account or credit card needed.

= What happens when my trial runs out? =

The widget shows an upgrade button linking to our pricing page. If you've used all your voice minutes but still have chat messages, the widget shows only the chat tab (and vice versa).

= Will the widget reactivate automatically after I purchase? =

Yes. Within 5 minutes of your purchase, the plugin detects the upgrade and the widget switches back to full mode. You don't need to copy and paste a license key.

= Can I customize the voice and personality of the agent? =

Yes. Go to **Voice AI → My Agent** to set the agent's name, voice (multiple voices available), response style (concise / balanced / detailed), system prompt, and knowledge base.

= What languages does the assistant speak? =

English, Persian (فارسی), Arabic, French, Spanish, and more. Set the language under **Voice AI → General**.

= Can I add the widget to specific pages only? =

Yes. By default the widget appears site-wide. You can disable that and use the shortcode `[smva_widget]` to place it manually on selected pages.

= Does this work on mobile? =

Yes. The widget is fully responsive and supports voice on mobile browsers that allow microphone access (most modern browsers do).

= Does the plugin send data anywhere? =

Yes. Because the AI runs on our hosted infrastructure (api2.studiometa.io), the plugin sends configuration data and conversation contents to our servers. See the **External Services** section above for full details.

= Is uninstalling the plugin clean? =

Yes. When you uninstall, the plugin removes all its options, transients, and licensing data from your WordPress database.

= Where can I get support? =

Visit [studiometa.io/contact-us](https://studiometa.io/contact-us/) or use the support forum on this plugin's WordPress.org page.

== Screenshots ==

1. Chat widget on a live site showing clickable contact cards (display_text feature)
2. Voice call in progress — real-time voice conversation with AI agent
3. Admin dashboard — usage stats, session history, and quota tracking
4. Agent customization — knowledge base import, system prompt, and suggested questions
5. Widget appearance — six visual themes to match your brand

== Source Code ==

The full source code of this plugin, including the unminified version of widget.js and all build tools, is publicly available on GitHub:

https://github.com/Pejvak2001/studiometa-voice-ai

== Changelog ==

= 1.3.75 =
* Fix: starting the free trial appeared to fail — the trial was activated correctly, but the admin screen reported "Could not reach the licensing server" and did not refresh, so you had to open the Dashboard tab to discover it had worked
* Fix: the Refresh button on the Dashboard did not actually update the usage figures
* Fix: the Dashboard could show "∞ days remaining" directly beside a real expiry date; the remaining days are now worked out from the expiry date itself
* Fix: when usage details could not be loaded, the Dashboard displayed "0 sessions" as though it were a real figure — even alongside recorded voice minutes and chat messages. Unknown figures now show a dash, and the license status falls back to what this site knows rather than always claiming "Active"
* Improved: refreshed admin design — the plugin logo replaces the placeholder icon, all menu icons are now crisp line drawings that render identically on every operating system, and usage figures are easier to read at a glance
* Privacy: the admin panel no longer downloads a font from a third-party server. Opening the plugin's admin pages previously sent a request — including your IP address — to an outside host on every page view. The panel now uses fonts already present on your computer, and no admin page view leaves your site
* Improved: status and setup messages on the License screen are now clearly visible instead of plain unstyled text
* Fix: if your agent used a newer voice this version did not recognise, the Settings screen displayed a different voice and saving would silently replace your real one; the configured voice is now always kept and shown
* Fix: session lists no longer describe a session of unknown type as "Voice" or show an unrecorded duration as "0.0 min", and a lead with no recorded source is no longer labelled "voice"
* Fix: the License screen no longer reports the plan as "Basic" when the plan is genuinely unknown

= 1.3.74 =
* New: Optional in-dashboard reminder inviting happy users to leave a review (appears only after the plugin has been active for a week; can be dismissed or snoozed)
* Fix: a JavaScript error on non-Leads admin tabs stopped later admin scripts from running; the Leads code now only runs on its own tab (this also removes an unnecessary background request on every other tab)
* Housekeeping: refreshed readme tags for discoverability

= 1.3.73 =
* Security: site fingerprint is no longer derived from AUTH_KEY. It is now built only from public site data, so no WordPress authentication secret ever leaves the site (WordPress.org review)
* Security: decoded JSON input is now sanitized recursively — keys, values and nested structure at every level — for agent tools and extra languages (WordPress.org review)

= 1.3.72 =
* New: Lead capture in chat mode — agent can save visitor name, email, phone, and notes via the save_lead tool
* Improved: Per-field rate limiting on lead capture (was a single shared limit) to prevent one field's spam from blocking the others
* fix: Integrations tab styles moved from inline <style> block to the enqueued admin.css (WordPress.org review)
* fix: Plugin URI updated to https://studiometa.io/ (previous /plugin/ URL returned 404)
* docs: HubSpot (api.hubapi.com) documented in the External services section of the readme

= 1.3.71 =
* fix: plain domain URLs (e.g. aarenocare.ca) now render as clickable links in chat widget
* fix: chat responses no longer use markdown formatting

= 1.3.70 =
* fix: widget now hides automatically when license is deleted or revoked from admin panel
* fix: hard delete of licenses now correctly removes chat_messages before deleting

= 1.3.69 =
* fix: sanitization hardened for agent_tools, extra_langs, and suggested_questions inputs
* fix: Terms of Service URL corrected in readme (was pointing to privacy policy)

= 1.3.68 =
* fix: chat usage now counted from chat_messages table (was incorrectly reading voice_sessions)
* fix: domain lock in trial-activate — prevents multiple trials per domain with different fingerprints
* fix: orphan docblock removed from class-smva.php
* fix: readme updated to reflect explicit trial activation flow (WordPress.org compliance)

= 1.3.67 =
* fix: remove debug message from voice sessions empty state

= 1.3.66 =
* fix: WordPress.org review compliance - moved inline scripts/styles to enqueued files
* fix: sanitization improvements for agent_tools and suggested_questions
* feat: HubSpot CRM integration via Private App Token
* feat: Knowledge base file upload (PDF, DOCX, CSV, TXT)
* fix: RTL layout fixes for wizard and admin UI
* fix: admin panel width and notice overlap improvements

= 1.3.65 =
* Voice Summary: hide Play button for sessions that do not have a saved recording.
* Voice Summary: show clear No recording status for sessions without audio files.


= 1.3.32 =
* New: Feature C — display_text tool: agent now shows clickable cards for email, phone, URL, and address in the chat panel
* New: Sticky call-bar in chat tab during active voice call (with End Call button and live timer)
* New: Chat message formatting — URLs rendered as clickable links, bold, italic, and line breaks supported
* Improved: Auto-switch to chat tab when display_text card arrives
* Improved: Deduplication guard prevents same card from appearing twice

= 1.3.20 =
* New: Feature A — auto-close call on goodbye (end_conversation tool)
* New: Feature B — request_text_input tool: agent can open chat panel to collect typed data during voice call
* New: Six widget visual themes: Classic, Floating, Soft Round, Dark Modern, Glass, Gradient
* New: Chat History tab with session grouping, collapsible cards, markdown rendering, and search
* New: Voice greeting TTS preview in admin panel (30 Gemini voices)
* New: Response Style selector (Precise / Balanced / Creative)
* New: Widget i18n supporting en, fa, ar, fr, es
* Improved: Domain lock and freemium onboarding flow with auto trial registration
* Improved: Monthly usage report via automated workflow

= 1.3.14 =
* Single source of truth improvements for quota and dashboard usage.

= 1.3.13 =
* Expanded the admin voice dropdown to include the full current set of 30 Gemini prebuilt voices.


= 1.2.0 =
* New: Per-site agent isolation — each site now has its own agent settings, knowledge base, and dashboard
* New: Single-site license model — activating a license on a new site auto-deactivates the previous site (with confirmation dialog)
* New: Site-replaced admin notice when this site has been auto-deactivated by activation elsewhere
* Improved: Widget gracefully hides when site is deactivated (HTTP 410 detection)
* Improved: Agent settings preserved across deactivation/reactivation cycles
* Security: Token revoked when site is auto-deactivated; another site cannot use this site's token

= 1.1.1 =
* Fixed: Double-escaping bug — apostrophes and quotes in system prompt, agent name, and other text fields no longer accumulate backslashes on each save
* Fixed: Same issue in license key, knowledge base, optimize agent, and crawl site forms
* Fixed: Suggested questions field

= 1.1.0 =
* New: Free trial activated automatically on install (30 voice minutes + 100 chat messages)
* New: Smart fallback — when one quota is exhausted, the other stays active
* New: Auto-upgrade — purchasing a plan reactivates the widget within 5 minutes, no license key paste needed
* New: Live quota progress bars in admin dashboard
* New: Trial banner with upgrade CTA
* New: Multi-language widget messages for limit-reached states
* Improved: Quota status cached in WordPress transients (reduces backend load)
* Improved: Site fingerprinting prevents trial-reset abuse from uninstall/reinstall

= 1.0.1 =
* Improved language sync between widget and backend agent
* Fixed agent_tools save handling

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.2.0 =
Per-site agent isolation. If you have used the same license on multiple sites, please review your active site after upgrade.

= 1.1.1 =
Critical fix: text fields no longer accumulate backslashes on save. Recommended for all users.

= 1.1.0 =
Adds free trial, smart quota fallback, and auto-upgrade. Recommended for all users.
