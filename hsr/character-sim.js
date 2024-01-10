(async () => {
  const data = await (await fetch('./assets/data.json')).json();

  let lang = 'zh-TW';

  function countAscension(lvl) {
    return Math.ceil((lvl - 20) / 10);
  }

  function getCharacter(id, lvl) {
    const { name, rarity, path, type, ...base } = data.characters[id];
    let result = {
      lvl: Math.floor(lvl),
      critRate: 0.05,
      critDmg: 1.5,
      ...base,
    };
    for (const x of ['hp', 'atk', 'def']) {
      result[x] = base[x] * (1 + ((result.lvl - 1) * 0.05) + (countAscension(lvl) * 0.4));
    }
    return result;
  }

  function getLightCone(id, lvl) {
    const { name, rarity, path, ...base } = data.lightCones[id];
    let result = { lvl: Math.floor(lvl), ...base };
    for (const x of ['hp', 'atk', 'def']) {
      result[x] = base[x] * (1 + ((result.lvl - 1) * 0.15));
      let i = countAscension(lvl);
      if (i-- > 0) result[x] += base[x] * 1.2;
      result[x] += base[x] * 1.6 * i;
    }
    return result;
  }

  function Button() {
    let result = document.createElement('span');
    result.classList.add('btn');
    return result;
  }

  function Dropdown(items) {
    let result = document.createElement('div');
    result.classList.add('dropdown');

    let btn = Button();
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
    result.appendChild(btn);

    let menu = document.createElement('ul');
    menu.classList.add('dropdown-menu', 'hidden');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        result.dispatchEvent(new CustomEvent('lmn-select', { detail: { selection: item.dataset.value } }));
      });
    });
    menu.replaceChildren(...items);
    result.appendChild(menu);

    document.addEventListener('click', (event) => {
      if (event.target !== btn) {
        menu.classList.add('hidden');
      }
    });

    Object.defineProperty(result, 'button', {
      get() {
        return btn;
      },
    });
    return result;
  }

  function createModal(title, ...contents) {
    let result = document.createElement('div');
    result.classList.add('modal-container', 'hidden');
    result.addEventListener('click', (event) => {
      if (!event.target.closest('.modal'))
        result.classList.add('hidden');
    });

    let modal = document.createElement('div');
    modal.classList.add('modal');

    let modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    let modalTitle = document.createElement('h1');
    modalTitle.append(title);
    let close = document.createElement('span');
    close.classList.add('btn');
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    close.addEventListener('click', () => {
      result.classList.add('hidden');
    });
    modal.appendChild(modalHeader).append(modalTitle, close);

    let modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    modal.appendChild(modalContent).append(...contents);

    result.appendChild(modal);
    document.body.appendChild(result);
    return result;
  }

  const app = document.getElementById('app');
  const broker = {
    subscribers: {},
    subscribe(event, callback) {
      if (!this.subscribers[event]) this.subscribers[event] = [];
      this.subscribers[event].push(callback);
    },
    publish(event, data) {
      if (!this.subscribers[event]) this.subscribers[event] = [];
      this.subscribers[event].forEach(callback => callback(data));
    },
  };
  { // Character modal subcomponent.
    let listUpdaters = [];
    let filterState = { paths: { allDisabled: true }, types: { allDisabled: true } };
    let filter = document.createElement('ul');
    filter.classList.add('filter');
    for (const path in data.paths) {
      let btn = document.createElement('li');
      btn.classList.add('btn', 'avatar');
      btn.addEventListener('click', () => {
        filterState.paths[path] = !filterState.paths[path];
        filterState.paths.allDisabled = Object.values(filterState.paths).every((x) => !x);
        listUpdaters.forEach((f) => f());
        btn.classList.toggle('active');
      });
      let img = document.createElement('img');
      img.alt = data.paths[path][lang];
      img.decoding = 'async';
      img.src = `./assets/paths/${path}.webp`;
      filter.appendChild(btn).append(img);
      filterState.paths[path] = false;
    }
    for (const type in data.types) {
      let btn = document.createElement('li');
      btn.classList.add('btn', 'avatar');
      btn.addEventListener('click', () => {
        filterState.types[type] = !filterState.types[type];
        filterState.types.allDisabled = Object.values(filterState.types).every((x) => !x);
        listUpdaters.forEach((f) => f());
        btn.classList.toggle('active');
      });
      let img = document.createElement('img');
      img.alt = data.types[type][lang];
      img.decoding = 'async';
      img.src = `./assets/types/${type}.webp`;
      filter.appendChild(btn).append(img);
      filterState.types[type] = false;
    }

    let list = document.createElement('ul');
    list.classList.add('grid-list');
    for (const [id, character] of Object.entries(data.characters)) {
      let item = document.createElement('li');
      item.classList.add('btn', 'avatar');
      item.style.width = '80px';
      item.style.setProperty('--avatar-border-color', data.types[character.type].color);
      item.addEventListener('click', () => {
        broker.publish('character', id);
        modal.classList.add('hidden');
      });
      listUpdaters.push(() => {
        if ((filterState.paths[character.path] || filterState.paths.allDisabled)
          && (filterState.types[character.type] || filterState.types.allDisabled)) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
      let img = document.createElement('img');
      img.decoding = 'async';
      img.src = `./assets/characters/${id}.webp`;
      let name = document.createElement('span');
      name.textContent = character.name[lang];
      list.appendChild(item).append(img, name);
    }

    let modal = createModal('Character', filter, list);
    let button = Button();
    button.classList.add('block');
    broker.subscribe('character', (id) => button.textContent = data.characters[id].name[lang]);
    button.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
    app.appendChild(button);
  }
  { // Light cone dropdown subcomponent.
    let dropdown = Dropdown(
      Object.entries(data.lightCones)
        .map(([id, lightCone]) => {
          let item = document.createElement('li');
          item.dataset.value = id;
          let img = document.createElement('img');
          img.decoding = 'async';
          img.src = `./assets/light-cones/${id}.webp`;
          img.style.display = 'inline';
          img.style.verticalAlign = 'middle';
          img.style.height = '60px';
          img.style.marginRight = '8px';
          let name = document.createElement('span');
          name.textContent = lightCone.name[lang];
          item.append(img, name);
          broker.subscribe('character', (character) => {
            item.classList.toggle('hidden', lightCone.path !== data.characters[character].path);
          });
          return item;
        })
    );
    broker.subscribe('character', (character) => {
      broker.publish('lightCone', '');
    });
    dropdown.button.classList.add('block');
    broker.subscribe('lightCone', (id) => dropdown.button.textContent = data.lightCones[id].name[lang]);
    dropdown.addEventListener('lmn-select', (event) => {
      broker.publish('lightCone', event.detail.selection);
    });
    app.appendChild(dropdown);
  }
  { // Character panel subcomponent.
    let panel = document.createElement('ul');
    panel.classList.add('panel');
    for (const statName of ['hp', 'atk', 'def', 'spd', 'critRate', 'critDmg']) {
      let item = document.createElement('li');
      let panelName = document.createElement('span');
      panelName.classList.add('panel-name');
      panelName.textContent = data.stats[statName];
      item.appendChild(panelName);
      let panelValue = document.createElement('span');
      panelValue.classList.add('panel-value');
      let characterValue = 0;
      let lightConeValue = 0;
      broker.subscribe('character', (id) => {
        characterValue = getCharacter(id, 80)[statName];
        panelValue.textContent = (characterValue + lightConeValue).toFixed(2);
      });
      broker.subscribe('lightCone', (id) => {
        lightConeValue = getLightCone(id, 80)[statName] ?? 0;
        panelValue.textContent = (characterValue + lightConeValue).toFixed(2);
      });
      item.appendChild(panelValue);
      panel.appendChild(item);
    }
    app.appendChild(panel);
  }
  { // Sharing button.
    let sharingUrl = new URL(location);
    broker.subscribe('character', (id) => sharingUrl.searchParams.set('character', id));
    broker.subscribe('lightCone', (id) => sharingUrl.searchParams.set('light_cone', id));
    let toast = document.createElement('div');
    toast.classList.add('action-toast', 'hidden');
    document.body.appendChild(toast);
    let btn = Button();
    btn.id = 'share';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(sharingUrl.href);
        toast.innerHTML = `<i class="fa-solid fa-link"></i> Link copied.`;
      } catch (err) {
        console.warn('Failed to write the sharing URL to the clipboard.');
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Failed to copy.`;
      }
      toast.classList.remove('hidden');
      toast.addEventListener('animationend', () => toast.classList.add('hidden'));
    });
    app.appendChild(btn).append('Share');
  }

  let queries = new URLSearchParams(location.search);
  broker.publish('character', queries.get('character') ?? '10000');
  broker.publish('lightCone', queries.get('light_cone') ?? '');
})();
