(async () => {
  const data = await (await fetch('data.json')).json();

  let lang = 'zh-TW';

  function countAscension(lvl) {
    return Math.ceil((lvl - 20) / 10);
  }

  function getCharacter(id, lvl) {
    const {name, rarity, path, type, ...base} = data.characters[id];
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
    const {name, rarity, path, ...base} = data.lightCones[id];
    let result = {lvl: Math.floor(lvl), ...base};
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
    result.classList.add('button');
    return result;
  }

  function Dropdown(items) {
    let result = document.createElement('div');
    result.classList.add('dropdown');
    let state = false;

    let btn = Button();
    btn.addEventListener('click', () => {
      state = !state;
      render();
    });
    result.appendChild(btn);

    let menu = document.createElement('ul');
    menu.classList.add('dropdown-menu');
    result.setItems = function (items) {
      menu.replaceChildren();
      items.forEach((item) => {
        item.addEventListener('click', () => {
          result.dispatchEvent(new CustomEvent('lmn-select', {detail: {selection: item.dataset.value}}));
        });
        menu.appendChild(item);
      });
    };
    result.setItems(items);
    result.appendChild(menu);

    document.addEventListener('click', (event) => {
      if (event.target !== btn) {
        state = false;
        render();
      }
    });

    const render = () => {
      menu.hidden = !state;
    };
    render();

    Object.defineProperty(result, 'button', {
      get() {
        return btn;
      },
    });
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

  { // Character dropdown subcomponent.
    let items = [];
    for (const id in data.characters) {
      let item = document.createElement('li');
      item.dataset.value = id;
      item.textContent = data.characters[id].name[lang];
      items.push(item);
    }
    let dropdown = Dropdown(items);
    dropdown.button.classList.add('block');
    broker.subscribe('character', (id) => dropdown.button.textContent = data.characters[id].name[lang]);
    dropdown.addEventListener('lmn-select', (event) => {
      broker.publish('character', event.detail.selection);
    });
    app.appendChild(dropdown);
  }
  { // Light cone dropdown subcomponent.
    let dropdown = Dropdown([]);
    broker.subscribe('character', (character) => {
      let items = [];
      for (const id in data.lightCones) {
        let lightCone = data.lightCones[id];
        if (lightCone.path === data.characters[character].path) {
          let item = document.createElement('li');
          item.dataset.value = id;
          item.textContent = lightCone.name[lang];
          items.push(item);
        }
      }
      dropdown.setItems(items);
      broker.publish('lightCone', items[0].dataset.value);
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
