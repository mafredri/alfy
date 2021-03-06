'use strict';
/* eslint-disable dot-notation */
const os = require('os');
const path = require('path');
const fs = require('fs');
const findUp = require('find-up');
const Conf = require('conf');
const hookStd = require('hook-std');
const loudRejection = require('loud-rejection');
const cleanStack = require('clean-stack');

// prevent caching of this module so module.parent is always accurate
delete require.cache[__filename];
const parentDir = path.dirname(module.parent.filename);

const alfy = module.exports;

const getVersion = () => {
	const infoPlist = findUp.sync('info.plist', {cwd: parentDir});

	// happens when testing
	if (!infoPlist) {
		return '';
	}

	return /<key>version<\/key>[\s\S]*<string>([\d.]+)<\/string>/.exec(fs.readFileSync(infoPlist, 'utf8'))[1];
};

const getIcon = name => `/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/${name}.icns`;
const getEnv = key => process.env[`alfred_${key}`];

alfy.meta = {
	name: getEnv('workflow_name'),
	version: getVersion(),
	uid: getEnv('workflow_uid'),
	bundleId: getEnv('workflow_bundleid')
};

alfy.alfred = {
	version: getEnv('version'),
	theme: getEnv('theme'),
	themeBackground: getEnv('theme_background'),
	themeSelectionBackground: getEnv('theme_selection_background'),
	themeSubtext: Number(getEnv('theme_subtext')),
	data: getEnv('workflow_data'),
	cache: getEnv('workflow_cache'),
	preferences: getEnv('preferences'),
	preferencesLocalHash: getEnv('preferences_localhash')
};

alfy.input = process.argv[2];

alfy.output = arr => {
	console.log(JSON.stringify({items: arr}, null, '\t'));
};

alfy.log = str => {
	if (alfy.debug) {
		console.log(str);
	}
};

alfy.error = err => {
	const stack = cleanStack(err.stack || err);

	const copy = `
\`\`\`
${stack}
\`\`\`

-
${alfy.meta.name} ${alfy.meta.version}
Alfred ${alfy.alfred.version}
${process.platform} ${process.arch} ${os.release()}
	`.trim();

	alfy.output([{
		title: err.stack ? `${err.name}: ${err.message}` : err,
		subtitle: 'Press ⌘L to see the full error and ⌘C to copy it.',
		valid: false,
		text: {
			copy,
			largetype: stack
		},
		icon: {
			path: exports.icon.error
		}
	}]);
};

if (process.env.AVA) {
	alfy.alfred.data = alfy.alfred.cache = os.tmpdir();
}

alfy.config = new Conf({
	cwd: alfy.alfred.data
});

alfy.cache = new Conf({
	configName: 'cache',
	cwd: alfy.alfred.cache
});

alfy.debug = getEnv('debug') === '1';

alfy.icon = {
	get: getIcon,
	info: getIcon('ToolbarInfo'),
	warning: getIcon('AlertCautionIcon'),
	error: getIcon('AlertStopIcon'),
	alert: getIcon('Actions'),
	like: getIcon('ToolbarFavoritesIcon'),
	delete: getIcon('ToolbarDeleteIcon')
};

loudRejection(alfy.error);
process.on('uncaughtException', alfy.error);
hookStd.stderr(alfy.error);
