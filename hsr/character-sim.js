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
    result.setItems = function (items) {
      items.forEach((item) => {
        item.addEventListener('click', () => {
          result.dispatchEvent(new CustomEvent('lmn-select', { detail: { selection: item.dataset.value } }));
        });
      });
      menu.replaceChildren(...items);
    };
    result.setItems(items);
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
    let filterState = { paths: {}, types: {} };
    let filter = document.createElement('ul');
    filter.classList.add('filter');
    for (const path in data.paths) {
      let btn = document.createElement('li');
      btn.classList.add('btn', 'avatar');
      btn.addEventListener('click', () => {
        filterState.paths[path] = !filterState.paths[path];
        listUpdaters.forEach((f) => f());
        btn.classList.toggle('active');
      });
      let img = document.createElement('img');
      img.src = `./assets/paths/${path}.png`;
      img.alt = data.paths[path][lang];
      filter.appendChild(btn).append(img);
      filterState.paths[path] = false;
    }
    for (const type in data.types) {
      let btn = document.createElement('li');
      btn.classList.add('btn', 'avatar');
      btn.addEventListener('click', () => {
        filterState.types[type] = !filterState.types[type];
        listUpdaters.forEach((f) => f());
        btn.classList.toggle('active');
      });
      let img = document.createElement('img');
      img.src = `./assets/types/${type}.png`;
      img.alt = data.types[type][lang];
      filter.appendChild(btn).append(img);
      filterState.types[type] = false;
    }

    let list = document.createElement('ul');
    list.classList.add('grid-list');
    for (const id of Object.keys(data.characters).sort()) {
      let character = data.characters[id];
      let item = document.createElement('li');
      item.classList.add('btn', 'avatar');
      item.style.width = '80px';
      item.style.setProperty('--avatar-border-color', data.types[character.type].color);
      item.addEventListener('click', () => {
        broker.publish('character', id);
        modal.classList.add('hidden');
      });
      listUpdaters.push(() => {
        if ((filterState.paths[character.path] || Object.values(filterState.paths).every((x) => !x))
          && (filterState.types[character.type] || Object.values(filterState.types).every((x) => !x))) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
      let img = document.createElement('img');
      img.src = `./assets/characters/${id}.png`;
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
    let dropdown = Dropdown([]);
    broker.subscribe('character', (character) => {
      let items = [];
      for (const id of Object.keys(data.lightCones).sort()) {
        let lightCone = data.lightCones[id];
        if (lightCone.path === data.characters[character].path) {
          let item = document.createElement('li');
          item.dataset.value = id;
          let img = document.createElement('img');
          img.src = `./assets/light-cones/${id}.png`;
          img.style.display = 'inline';
          img.style.verticalAlign = 'middle';
          img.style.height = '60px';
          img.style.marginRight = '8px';
          let name = document.createElement('span');
          name.textContent = lightCone.name[lang];
          item.append(img, name);
          items.push(item);
        }
      }
      dropdown.setItems(items);
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
  broker.publish('character', '0000');
})();
