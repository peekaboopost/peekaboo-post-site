// Peekaboo Post invite runtime.
// Renders an invite card from a <template id="card-template">, its logic from
// <script type="text/x-card" id="card-logic"> and default settings from
// <script type="application/json" id="card-props">. Supports {{ path }} holes,
// <sc-if value="{{ x }}">, <sc-for list="{{ xs }}" as="item">, onClick/onInput handlers,
// and updates the page in place so animations and typing are never interrupted.
(function () {
  'use strict';

  var WHOLE = /^\s*\{\{([^}]+)\}\}\s*$/;
  var ANY = /\{\{([^}]+)\}\}/g;
  var mount, template, component, scheduled = false;

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (partial, callback) {
    var next = typeof partial === 'function' ? partial(this.state, this.props) : partial;
    this.state = Object.assign({}, this.state, next);
    schedule();
    if (callback) callback();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };

  function lookup(ctx, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    return path.split('.').reduce(function (obj, key) { return obj == null ? undefined : obj[key]; }, ctx);
  }

  function fill(text, ctx) {
    return text.replace(ANY, function (_, path) {
      var value = lookup(ctx, path);
      return value == null ? '' : String(value);
    });
  }

  function bind(el) {
    if (!el.__h) return;
    el.__bound = el.__bound || {};
    Object.keys(el.__h).forEach(function (type) {
      if (el.__bound[type]) return;
      el.__bound[type] = true;
      el.addEventListener(type, function (event) {
        var handler = el.__h && el.__h[type];
        if (typeof handler === 'function') handler(event);
      });
    });
  }

  function build(source, ctx, out) {
    var children = source.childNodes;
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      if (node.nodeType === 3) {
        out.appendChild(document.createTextNode(fill(node.nodeValue, ctx)));
        continue;
      }
      if (node.nodeType !== 1) continue;
      var tag = node.localName;

      if (tag === 'helmet') continue;
      if (tag === 'sc-if') {
        var cond = (node.getAttribute('value') || '').match(WHOLE);
        if (cond && lookup(ctx, cond[1])) build(node, ctx, out);
        continue;
      }
      if (tag === 'sc-for') {
        var listMatch = (node.getAttribute('list') || '').match(WHOLE);
        var list = listMatch ? lookup(ctx, listMatch[1]) : null;
        var as = node.getAttribute('as') || 'item';
        if (Array.isArray(list)) {
          list.forEach(function (item, index) {
            var child = Object.create(ctx);
            child[as] = item;
            child.$index = index;
            build(node, child, out);
          });
        }
        continue;
      }

      var el = document.createElementNS(node.namespaceURI, tag);
      var attrs = node.attributes;
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a].name;
        var raw = attrs[a].value;
        if (name.indexOf('hint-') === 0) continue;
        var whole = raw.match(WHOLE);
        if (name.indexOf('on') === 0 && whole) {
          el.__h = el.__h || {};
          el.__h[name.slice(2).toLowerCase()] = lookup(ctx, whole[1]);
          continue;
        }
        if (whole) {
          var value = lookup(ctx, whole[1]);
          if (value === false || value == null) continue;
          el.setAttribute(name, value === true ? '' : String(value));
        } else {
          el.setAttribute(name, fill(raw, ctx));
        }
      }
      if ((tag === 'input' || tag === 'textarea') && el.hasAttribute('value')) {
        el.value = el.getAttribute('value');
      }
      bind(el);
      build(node, ctx, el);
      out.appendChild(el);
    }
  }

  function sameKind(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    return a.namespaceURI === b.namespaceURI && a.localName === b.localName;
  }

  function morph(live, next) {
    if (live.nodeType === 3) {
      if (live.nodeValue !== next.nodeValue) live.nodeValue = next.nodeValue;
      return;
    }
    var i, attr;
    var liveAttrs = Array.prototype.slice.call(live.attributes);
    for (i = 0; i < liveAttrs.length; i++) {
      if (!next.hasAttribute(liveAttrs[i].name)) live.removeAttribute(liveAttrs[i].name);
    }
    for (i = 0; i < next.attributes.length; i++) {
      attr = next.attributes[i];
      if (live.getAttribute(attr.name) !== attr.value) live.setAttribute(attr.name, attr.value);
    }
    if ((live.localName === 'input' || live.localName === 'textarea') && document.activeElement !== live) {
      var v = next.getAttribute('value') || '';
      if (live.value !== v) live.value = v;
    }
    live.__h = next.__h;
    bind(live);
    morphChildren(live, next);
  }

  function morphChildren(live, next) {
    var a = Array.prototype.slice.call(live.childNodes);
    var b = Array.prototype.slice.call(next.childNodes);
    for (var i = 0; i < b.length; i++) {
      if (!a[i]) { live.appendChild(b[i]); continue; }
      if (sameKind(a[i], b[i])) morph(a[i], b[i]);
      else live.replaceChild(b[i], a[i]);
    }
    for (var j = b.length; j < a.length; j++) live.removeChild(a[j]);
  }

  var wasSubmitted = false;

  // On a customer's invite (pages with <meta name="pp-event">), save each RSVP.
  function saveRsvp() {
    var meta = document.querySelector('meta[name="pp-event"]');
    if (!meta) return; // gallery demos are never saved
    var details = {};
    Object.keys(component.state).forEach(function (key) {
      var value = component.state[key];
      if (['phase', 'info', 'calOpen', 'error', 'submitted', 'spinning', 'result', 'wall'].indexOf(key) !== -1) return;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) details[key] = value;
    });
    fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: meta.content, invite: document.body.getAttribute('data-invite') || '', details: details })
    }).catch(function () {});
  }

  function render() {
    scheduled = false;
    var nowSubmitted = !!(component.state && component.state.submitted);
    if (nowSubmitted && !wasSubmitted) saveRsvp();
    wasSubmitted = nowSubmitted;
    var fresh = document.createElement('div');
    build(template.content, component.renderVals() || {}, fresh);
    morphChildren(mount, fresh);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  }

  function readProps() {
    var props = {};
    var el = document.getElementById('card-props');
    var spec = el ? JSON.parse(el.textContent) : {};
    Object.keys(spec).forEach(function (key) {
      if (key.charAt(0) !== '$' && spec[key] && 'default' in spec[key]) props[key] = spec[key].default;
    });
    // Hosts' details can be passed in the link, e.g. ?eventDate=2026-11-21T18:00
    var params = new URLSearchParams(window.location.search);
    Object.keys(props).forEach(function (key) {
      if (params.has(key)) props[key] = params.get(key);
    });
    return props;
  }

  function fit() {
    var frame = document.querySelector('.frame');
    if (!frame) return;
    var phone = window.innerWidth <= 520;
    var scale, height;
    if (phone) {
      scale = window.innerWidth / 390;
      height = window.innerHeight / scale;
    } else {
      scale = Math.min(1, (window.innerHeight - 120) / 844);
      height = 844;
    }
    frame.style.setProperty('--card-scale', scale);
    frame.style.setProperty('--card-h', height + 'px');
  }

  function start() {
    mount = document.getElementById('card');
    template = document.getElementById('card-template');
    var source = document.getElementById('card-logic').textContent;
    var Component = new Function('DCLogic', source + '\nreturn Component;')(DCLogic);
    component = new Component(readProps());
    if (!component.state) component.state = {};
    render();
    fit();
    window.addEventListener('resize', fit);
    if (typeof component.componentDidMount === 'function') component.componentDidMount();
    window.addEventListener('pagehide', function () {
      if (typeof component.componentWillUnmount === 'function') component.componentWillUnmount();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
