# Falcon Academy website redesign: static export

This folder is a static HTML and CSS copy of every page in the "Falcon Academy Website Redesign" design canvas. It was exported on 13 October 2026.

Open `index.html` to see a list of all 56 pages. Every page opens on its own in a browser, with no server or build step needed.

## What's in the folder

| Path | Contents |
|---|---|
| `index.html` | A list of every page, grouped by section |
| `*.html` | One file per page, for example `Main.html`, `Curriculum.html` and `HowToApply.html` |
| `css/base.css` | Styles shared by most pages: colors, buttons, cards, tabs and type |
| `css/pages/<Page>.css` | Styles used by one page only |
| `assets/img/` | 53 photos and logos, named after their descriptions |
| `js/site.js` | A small script that highlights the current section in “On this page” menus while you scroll |

## Things to know

- **Menus.** The top menu shows each section’s pages when you hover over it or move to it with the keyboard. This uses CSS only.
- **The pages are static.** Each page was saved as it looks when it first opens, so controls that changed the page in the canvas no longer work. This affects filters, tabs, accordions, the mobile menu and forms. Pages with controls like these: Accreditation, AdmissionsOverview, AfterSchool, AfterSchoolLive, AfterSchoolLiveV2, CalendarEvents, CalendarMonth, Feedback, JobApply, MenuMobile, News, OpenRoles, OurStory, PhotoAlbum, PhotosVideos, Policies, Store, Tuition, VideosTab and VisitTour. The photo picker in the Home page hero works without JavaScript. A developer needs to add JavaScript, or WordPress or Elementor widgets, for these.
- **Most layout styles are inline.** The design tool writes spacing, colors and layout as `style="…"` attributes on each element. Shared classes are in `css/base.css`, but a production build should move the repeated inline styles into CSS classes.
- **Fonts** load from Google Fonts (Inter), so pages need an internet connection to show the right font.
- **Placeholders.** Text in square brackets, such as `[Photo: …]` or `[Confirm with admissions]`, marks content the school still has to provide or confirm.
- **Links** between pages point to the other `.html` files in this folder. Links to Edumagined, Google Maps and social media go to the live sites.
- **Canvas-only pages.** `Navigation.html` (the menu before and after the redesign), `Style.html` (the style guide), `HomeMobile.html` and `MenuMobile.html` (phone mockups) are design references, not website pages.
