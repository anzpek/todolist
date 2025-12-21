const fs = require('fs');
const path = 'c:/Users/dan/Documents/todolist/src/locales/en.json';

try {
    const raw = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(raw);

    let modifications = 0;

    // 1. Move sharing out of settings if nested
    if (data.settings && data.settings.sharing) {
        console.log('Found nested sharing object in settings. Moving to root...');
        const sharing = data.settings.sharing;
        delete data.settings.sharing;

        // Merge with existing root sharing if any
        data.sharing = { ...data.sharing, ...sharing };
        modifications++;
    }

    // 2. Ensure basic keys exist
    if (!data.sharing) data.sharing = {};

    if (!data.sharing.settingsTitle) {
        console.log('Adding missing key: sharing.settingsTitle');
        data.sharing.settingsTitle = "Sharing Settings";
        modifications++;
    }

    if (data.nav && !data.nav.sharing) {
        console.log('Adding missing key: nav.sharing');
        data.nav.sharing = "Sharing Settings";
        modifications++;
    }

    if (modifications > 0) {
        fs.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
        console.log('Successfully fixed en.json structure.');
    } else {
        console.log('No modifications needed.');
    }

} catch (e) {
    console.error('Error fixing JSON:', e);
    process.exit(1);
}
