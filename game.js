/* People + Pets matching game.
   Data comes from data/pairs.json. Each entry is one owner with their own pet; the pet is
   correct only in the frame beside that owner. Photos are file paths such as "photos/maya.jpg".
   Leave a photo blank to show a placeholder tile. */
(function () {
  'use strict';

  var DATA_URL = 'data/pairs.json';
  var wall = document.getElementById('wall');

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + DATA_URL + ' (status ' + r.status + ').');
      return r.json();
    })
    .then(function (rows) {
      if (!Array.isArray(rows) || rows.length === 0) throw new Error(DATA_URL + ' must be a list with at least one entry.');
      var pairs = rows.map(function (r, i) {
        if (!r || !r.owner || !r.pet) throw new Error('Entry ' + (i + 1) + ' in ' + DATA_URL + ' needs an "owner" and a "pet".');
        return {
          id: 'p' + (i + 1),
          owner: String(r.owner),
          ownerPhoto: r.ownerPhoto ? String(r.ownerPhoto) : '',
          pet: String(r.pet),
          petPhoto: r.petPhoto ? String(r.petPhoto) : '',
          type: r.type ? String(r.type) : 'Pet'
        };
      });
      start(pairs);
    })
    .catch(function (err) {
      var li = document.createElement('li');
      li.className = 'wrap';
      li.style.cssText = 'list-style:none;padding-top:12px;padding-bottom:12px';
      li.textContent = 'The game could not load its data. ' + err.message +
        ' If you opened index.html straight from a folder, run a local web server or use the published link instead.';
      wall.appendChild(li);
    });

  function start(PAIRS) {
    var $ = function (s) { return document.querySelector(s); };
    var shelf = $('#shelf'), statusEl = $('#status'), actionsEl = $('#actions'), dock = $('#dock');
    var TOTAL = PAIRS.length;
    var byId = {};
    PAIRS.forEach(function (p, i) { byId[p.id] = Object.assign({ i: i }, p); });

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function shuffle(a) {
      var b = a.slice();
      for (var k = 0; k < 6; k++) {
        b = a.slice();
        for (var i = b.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = b[i]; b[i] = b[j]; b[j] = t;
        }
        var same = b.every(function (v, i) { return v === a[i]; });
        if (!same || b.length < 2) return b;
      }
      return b;
    }
    function initials(name) {
      var parts = name.trim().split(/\s+/);
      return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    var ICON = {
      check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
      x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      plus: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
    };

    var state;
    function fresh() {
      state = {
        order: shuffle(PAIRS.map(function (p) { return p.id; })),
        placed: {},            // ownerId -> petId
        locked: {},            // ownerId -> true (confirmed correct)
        selected: null,        // petId picked by tap
        phase: 'play',         // play | graded | revealed
        results: {},           // ownerId -> true/false from the last Submit
        attempts: 0,
        lastPlaced: null,
        justGraded: false
      };
    }
    function ownerOf(petId) {
      for (var k in state.placed) if (state.placed[k] === petId) return k;
      return null;
    }
    function count(o) { return Object.keys(o).length; }

    function face(pet) {
      if (pet.petPhoto) return '<img src="' + esc(pet.petPhoto) + '" alt="" draggable="false" decoding="async">';
      var hue = (pet.i * 36 + 12) % 360;
      return '<span class="ph" style="--h:' + hue + '"><b>' + esc(pet.pet[0].toUpperCase()) + '</b><i>' + esc(pet.type) + '</i></span>';
    }
    function petBtn(pet, where, disabled, selected) {
      return '<button type="button" class="pet' + (where === 'slot' ? ' inslot' : '') + (selected ? ' sel' : '') + '"' +
        ' data-pet="' + pet.id + '" data-where="' + where + '"' + (disabled ? ' disabled' : '') +
        (where === 'shelf' ? ' aria-pressed="' + (selected ? 'true' : 'false') + '"' : '') +
        ' aria-label="' + esc(pet.type) + ', photo ' + (pet.i + 1) + '">' + face(pet) + '</button>';
    }

    function render() {
      var ae = document.activeElement, focusSel = null;
      if (ae && ae.dataset) {
        if (ae.dataset.pet) focusSel = '[data-pet="' + ae.dataset.pet + '"]';
        else if (ae.dataset.slot) focusSel = '[data-slot="' + ae.dataset.slot + '"] button, button[data-slot="' + ae.dataset.slot + '"]';
        else if (ae.dataset.act) focusSel = '[data-act="' + ae.dataset.act + '"]';
      }

      var placedIds = {};
      for (var k in state.placed) placedIds[state.placed[k]] = true;
      var play = state.phase === 'play';
      document.body.classList.toggle('has-selection', !!state.selected && play);

      wall.innerHTML = PAIRS.map(function (p, idx) {
        var petId = state.placed[p.id];
        var isLocked = !!state.locked[p.id];
        var cls = '';
        if (isLocked) cls = (state.phase === 'revealed' && state.results[p.id] === false) ? 'rev' : 'ok';
        else if (state.phase === 'graded' && state.results[p.id] === false) cls = 'bad';
        var anim = '';
        if (state.justGraded) anim = cls === 'ok' ? ' cheer' : cls === 'bad' ? ' shake' : '';

        var res;
        if (cls === 'ok') res = 'Match · ' + esc(p.pet);
        else if (cls === 'bad') res = 'Not a match';
        else if (cls === 'rev') res = 'Answer · ' + esc(p.pet);
        else res = petId ? 'Pet placed' : 'Needs a pet';

        var slot;
        if (petId) {
          var badge = cls === 'ok' ? '<span class="badge">' + ICON.check + '</span>' : cls === 'bad' ? '<span class="badge">' + ICON.x + '</span>' : '';
          slot = '<div class="slot filled' + (state.lastPlaced === p.id ? ' fresh' : '') + '" data-slot="' + p.id + '">' +
            petBtn(byId[petId], 'slot', !play || isLocked, false) + badge + '</div>';
        } else {
          slot = '<button type="button" class="slot" data-slot="' + p.id + '" aria-label="Empty frame next to ' + esc(p.owner) + '"' +
            (play ? '' : ' disabled') + '>' + ICON.plus + '</button>';
        }
        var portrait = p.ownerPhoto
          ? '<img src="' + esc(p.ownerPhoto) + '" alt="" decoding="async">'
          : esc(initials(p.owner));
        var hue = (idx * 36 + 200) % 360;
        return '<li class="row' + (cls ? ' ' + cls : '') + anim + '" data-owner="' + p.id + '" style="--n:' + idx + '">' +
          '<div class="portrait" style="--h:' + hue + '" role="img" aria-label="Portrait of ' + esc(p.owner) + '">' + portrait + '</div>' +
          '<div class="who"><span class="cap">No. ' + String(idx + 1).padStart(2, '0') + '</span>' +
          '<p class="name">' + esc(p.owner) + '</p><span class="cap res">' + res + '</span></div>' +
          slot + '</li>';
      }).join('');

      var onShelf = state.order.filter(function (id) { return !placedIds[id]; });
      shelf.innerHTML = onShelf.map(function (id) { return petBtn(byId[id], 'shelf', false, state.selected === id); }).join('');
      shelf.hidden = !play || onShelf.length === 0;

      var n = count(state.placed), correct = count(state.locked);
      var status = '', actions = '';
      if (state.phase === 'play') {
        status = state.selected
          ? 'Now tap a frame.'
          : '<strong>' + n + '/' + TOTAL + '</strong> placed' + (state.attempts ? ' · attempt ' + (state.attempts + 1) : '');
        actions = '<button type="button" class="btn" data-act="submit"' + (n < TOTAL ? ' disabled' : '') + '>Submit</button>';
      } else if (state.phase === 'graded') {
        if (correct === TOTAL) {
          status = '<strong>' + correct + '/' + TOTAL + '</strong> correct. Every pet is home.';
          actions = '<button type="button" class="btn" data-act="reset">Play again</button>';
        } else {
          status = '<strong>' + correct + '/' + TOTAL + '</strong> correct';
          actions = '<button type="button" class="btn" data-act="fix">Fix the wrong ones</button>' +
            '<button type="button" class="btn ghost" data-act="reveal">Reveal answers</button>' +
            '<button type="button" class="btn ghost" data-act="reset">Start over</button>';
        }
      } else {
        status = 'Answers revealed';
        actions = '<button type="button" class="btn" data-act="reset">Play again</button>';
      }
      statusEl.innerHTML = status;
      actionsEl.innerHTML = actions;

      state.lastPlaced = null;
      state.justGraded = false;

      if (focusSel) {
        var el = document.querySelector(focusSel);
        if (el && !el.disabled) el.focus({ preventScroll: true });
      }
    }

    function placeAt(petId, ownerId) {
      if (state.locked[ownerId]) return;
      var from = ownerOf(petId);
      var prev = state.placed[ownerId];
      if (prev === petId) return;
      if (from) delete state.placed[from];
      state.placed[ownerId] = petId;
      if (from && prev) state.placed[from] = prev;   // dragged between two frames: swap
      state.selected = null;
      state.lastPlaced = ownerId;
    }

    function grade() {
      if (count(state.placed) < TOTAL) return;
      state.attempts++;
      state.results = {};
      PAIRS.forEach(function (p) {
        var ok = state.placed[p.id] === p.id;
        state.results[p.id] = ok;
        if (ok) state.locked[p.id] = true;
      });
      state.phase = 'graded';
      state.justGraded = true;
    }
    function act(name) {
      if (name === 'submit') grade();
      else if (name === 'fix') {
        PAIRS.forEach(function (p) { if (!state.locked[p.id]) delete state.placed[p.id]; });
        state.results = {};
        state.selected = null;
        state.phase = 'play';
      } else if (name === 'reveal') {
        PAIRS.forEach(function (p) { state.placed[p.id] = p.id; state.locked[p.id] = true; });
        state.phase = 'revealed';
      } else if (name === 'reset') fresh();
      render();
      if (name === 'reset') window.scrollTo(0, 0);
    }

    /* Taps and clicks */
    var suppressClick = false;
    document.addEventListener('click', function (e) {
      if (suppressClick) return;
      var a = e.target.closest('[data-act]');
      if (a) { act(a.dataset.act); return; }
      if (state.phase !== 'play') return;
      var pet = e.target.closest('.pet');
      if (pet && !pet.disabled) {
        var id = pet.dataset.pet;
        if (pet.dataset.where === 'shelf') {
          state.selected = state.selected === id ? null : id;
        } else {
          var owner = ownerOf(id);
          if (state.selected && state.selected !== id) placeAt(state.selected, owner);
          else { delete state.placed[owner]; state.selected = null; }
        }
        render();
        return;
      }
      var row = e.target.closest('.row');
      if (row && state.selected && !state.locked[row.dataset.owner]) {
        placeAt(state.selected, row.dataset.owner);
        render();
      }
    });

    /* Dragging with pointer events (works for mouse, pen and touch) */
    var drag = null, ghost = null, raf = 0, overRow = null;
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.pet')) e.preventDefault(); });

    document.addEventListener('pointerdown', function (e) {
      if (state.phase !== 'play' || drag) return;
      var tile = e.target.closest('.pet');
      if (!tile || tile.disabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = {
        id: tile.dataset.pet, tile: tile, where: tile.dataset.where, pid: e.pointerId,
        sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
        started: false, touch: e.pointerType === 'touch'
      };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      drag.x = e.clientX; drag.y = e.clientY;
      if (!drag.started) {
        if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) < 8) return;
        if (drag.touch && drag.where === 'slot') { drag = null; return; }   // touch: placed pets return by tap
        startDrag();
      }
      moveGhost();
    });
    window.addEventListener('pointerup', function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      if (!d.started) { drag = null; return; }
      d.x = e.clientX; d.y = e.clientY;
      var t = findTarget();
      endDrag();
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      if (t && t.type === 'owner') placeAt(d.id, t.id);
      else if (t && t.type === 'shelf' && d.where === 'slot') {
        var from = ownerOf(d.id);
        if (from) delete state.placed[from];
      }
      render();
    });
    window.addEventListener('pointercancel', function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var was = drag.started;
      endDrag();
      if (was) render();
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drag && drag.started) { endDrag(); render(); }
    });

    function startDrag() {
      drag.started = true;
      ghost = drag.tile.cloneNode(true);
      ghost.removeAttribute('data-pet');
      ghost.removeAttribute('aria-pressed');
      ghost.classList.remove('sel');
      ghost.classList.add('ghosting');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.tabIndex = -1;
      document.body.appendChild(ghost);
      drag.tile.classList.add('lifting');
      document.body.classList.add('dragging');
      state.selected = null;
      document.body.classList.remove('has-selection');
      raf = requestAnimationFrame(tick);
    }
    function moveGhost() {
      if (ghost) ghost.style.transform = 'translate3d(' + (drag.x - 38) + 'px,' + (drag.y - 38) + 'px,0) rotate(4deg)';
    }
    function findTarget() {
      var el = document.elementFromPoint(drag.x, drag.y);
      if (!el) return null;
      var row = el.closest('.row');
      if (row) return state.locked[row.dataset.owner] ? null : { type: 'owner', id: row.dataset.owner };
      if (el.closest('.dock')) return { type: 'shelf' };
      return null;
    }
    function setOver(t) {
      if (overRow) {
        overRow.classList.remove('over');
        var s0 = overRow.querySelector('.slot'); if (s0) s0.classList.remove('over');
        overRow = null;
      }
      dock.classList.remove('over-dock');
      if (!t) return;
      if (t.type === 'owner') {
        overRow = wall.querySelector('[data-owner="' + t.id + '"]');
        if (overRow) {
          overRow.classList.add('over');
          var s1 = overRow.querySelector('.slot'); if (s1) s1.classList.add('over');
        }
      } else if (t.type === 'shelf' && drag.where === 'slot') dock.classList.add('over-dock');
    }
    function tick() {
      if (!drag || !drag.started) return;
      var top = dock.getBoundingClientRect().top, v = 0;
      if (drag.y < 110) v = -Math.min(18, (110 - drag.y) / 5);
      else if (drag.y < top && drag.y > top - 80) v = Math.min(18, (drag.y - (top - 80)) / 4);
      if (v) window.scrollBy(0, v);
      setOver(findTarget());
      raf = requestAnimationFrame(tick);
    }
    function endDrag() {
      cancelAnimationFrame(raf);
      setOver(null);
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      if (drag && drag.tile) drag.tile.classList.remove('lifting');
      document.body.classList.remove('dragging');
      drag = null;
    }

    fresh();
    render();
  }
})();
