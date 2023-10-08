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

  function addStats(...factors) {
    return factors.reduce((sum, value) => {
      for (const key in value) {
        if (!sum[key]) sum[key] = 0;
        sum[key] += value[key];
      }
      return sum;
    });
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

    result.setSelection = function (value) {
      result.dispatchEvent(new CustomEvent('lmn-select', {detail: {selection: value}}));
    };
    Object.defineProperty(result, 'button', {
      get() {
        return btn;
      },
    });
    return result;
  }

  const app = document.getElementById('app');
  let renderers = [];
  let state = new Proxy(
    {
      character: '',
      characterResult: null,
      lightCone: '',
      lightConeResult: null,
      result: null,
    },
    {
      set(state, key, newValue) {
        state[key] = newValue;
        renderers.forEach((f) => f());
        return true;
      },
    },
  );
  let lightConeDropdown = Dropdown([]);
  lightConeDropdown.button.classList.add('block');
  lightConeDropdown.addEventListener('lmn-select', (event) => {
    state.lightCone = event.detail.selection;
    state.lightConeResult = getLightCone(state.lightCone, 80);
    state.result = addStats(state.characterResult, state.lightConeResult);
    lightConeDropdown.button.textContent = data.lightCones[state.lightCone].name[lang];
  });
  { // Character dropdown subcomponent.
    let characterDropdownItems = [];
    for (const id in data.characters) {
      let item = document.createElement('li');
      item.dataset.value = id;
      item.textContent = data.characters[id].name[lang];
      characterDropdownItems.push(item);
    }
    let characterDropdown = Dropdown(characterDropdownItems);
    characterDropdown.button.classList.add('block');
    characterDropdown.addEventListener('lmn-select', (event) => {
      state.character = event.detail.selection;
      state.characterResult = getCharacter(state.character, 80);
      state.result = addStats(state.characterResult, state.lightConeResult);
      characterDropdown.button.textContent = data.characters[state.character].name[lang];

      let items = [];
      let availableLightConeIds = Object.entries(data.lightCones)
        .filter(([k, v]) => v.path === data.characters[state.character].path)
        .map(([k, v]) => k);
      for (const id of availableLightConeIds) {
        let item = document.createElement('li');
        item.dataset.value = id;
        item.textContent = data.lightCones[id].name[lang];
        items.push(item);
      }
      lightConeDropdown.setItems(items);
      lightConeDropdown.setSelection(availableLightConeIds[0]);
    });
    characterDropdown.setSelection('0000');
    app.appendChild(characterDropdown);
  }
  app.appendChild(lightConeDropdown);
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
      renderers.push(() => panelValue.textContent = state.result[statName].toFixed(2));
      item.appendChild(panelValue);
      panel.appendChild(item);
    }
    app.appendChild(panel);
  }

  renderers.forEach((f) => f());
})();
