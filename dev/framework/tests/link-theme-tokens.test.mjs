import assert from 'node:assert/strict';
import { LinkThemeTokens, LinkThemeTokenError } from '../themes/link-theme-tokens.js';

const theme = new LinkThemeTokens({
  normal: { color: 'var(--color-link)', decoration: 'underline', decorationStyle: 'solid' },
  hover: { color: '#1455cc' },
  focus: { outline: '2px solid currentColor' },
  visited: { color: 'rebeccapurple' },
  active: { color: '#001b44', decoration: 'none' },
  disabled: { opacity: 0.45, decoration: 'none' }
});
assert.deepEqual(LinkThemeTokens.states(), ['normal','hover','focus','visited','active','disabled']);
assert.deepEqual(theme.state('hover'), { color:'#1455cc', decoration:'underline', decorationStyle:'solid' });
assert.deepEqual(theme.state('focus'), { color:'var(--color-link)', decoration:'underline', decorationStyle:'solid', outline:'2px solid currentColor' });
assert.deepEqual(theme.state('hover',{inherit:false}), {color:'#1455cc'});
const variables = theme.variables();
assert.equal(variables['--nlab-link-color'], 'var(--color-link)');
assert.equal(variables['--nlab-link-hover-color'], '#1455cc');
assert.equal(variables['--nlab-link-hover-decoration'], 'underline');
assert.equal(variables['--nlab-link-focus-outline'], '2px solid currentColor');
assert.equal(variables['--nlab-link-disabled-opacity'], '0.45');

theme.merge({ hover: { decoration: 'none' }, disabled: { color: 'gray' } });
assert.equal(theme.state('hover').decoration, 'none');
assert.equal(theme.state('disabled').color, 'gray');
const snap = theme.snapshot(); snap.normal.color = 'red';
assert.equal(theme.state('normal').color, 'var(--color-link)');

const shorthand = new LinkThemeTokens({ color:'blue', decoration:'none' });
assert.deepEqual(shorthand.state('normal'), {color:'blue',decoration:'none'});
assert.equal(shorthand.state('visited').color, 'blue');

assert.throws(() => new LinkThemeTokens({normal:{color:'red; background:black'}}), e => e instanceof LinkThemeTokenError && e.code==='UNSAFE_CSS_VALUE');
assert.throws(() => new LinkThemeTokens({normal:{color:'url(x)'}}), e => e.code==='UNSAFE_CSS_VALUE');
assert.throws(() => new LinkThemeTokens({normal:{decoration:'blink'}}), e => e.code==='INVALID_ENUM');
assert.throws(() => new LinkThemeTokens({disabled:{opacity:2}}), e => e.code==='INVALID_OPACITY');
assert.throws(() => theme.state('pressed'), e => e.code==='UNKNOWN_STATE');
assert.throws(() => theme.variables({prefix:'link'}), e => e.code==='INVALID_PREFIX');

console.log('link theme tokens tests: ok');
