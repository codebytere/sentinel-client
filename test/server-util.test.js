const { expect } = require('chai');
const { generateSessionToken, getHostOS, getFriendlyName } = require('../src/utils/server-util');
const { ACTIONS_OPTIONS, PLATFORMS } = require('../constants');

describe('Server utilities', () => {
  it('Can generate a session token hash', () => {
    const sha = '0567bb6';
    const version = 'v8.4.1';
    const slug = 'microsoft/vscode';

    const generated = generateSessionToken(sha, version, slug);
    const expected = /0567bb6-(\d+)-(\d+)/;
    expect(generated).to.match(expected);
  });

  it('correctly maps platform to host OS', () => {
    for (const winPlat of PLATFORMS.WINDOWS) {
      const hostOS = getHostOS(winPlat);
      expect(hostOS).to.equal('windows-latest');
    }

    for (const linuxPlat of PLATFORMS.LINUX) {
      const hostOS = getHostOS(linuxPlat);
      expect(hostOS).to.equal('ubuntu-latest');
    }

    for (const darwinPlat of PLATFORMS.MACOS) {
      const hostOS = getHostOS(darwinPlat);
      expect(hostOS).to.equal('macos-latest');
    }
  })

  it('correctly maps hostOS to friendly name', () => {
    const mac = getFriendlyName(ACTIONS_OPTIONS.MACOS);
    expect(mac).to.equal('macos');

    const win = getFriendlyName(ACTIONS_OPTIONS.WINDOWS);
    expect(win).to.equal('windows');

    const linux = getFriendlyName(ACTIONS_OPTIONS.LINUX);
    expect(linux).to.equal('linux');
  })
})