(async () => {
  const data = await (await fetch('data.json')).json();

  function countAscension(lvl) {
    return Math.ceil((lvl - 20) / 10);
  }

  function getCharacter(name, lvl) {
    const base = data.characters[name];
    let result = {
      lvl: Math.floor(lvl),
      critRate: 0.05,
      critDmg: 1.5,
      ...base,
    };
    for (const x of ['hpMax', 'atk', 'def']) {
      result[x] = base[x] * (1 + ((result.lvl - 1) * 0.05) + (countAscension(lvl) * 0.4));
    }
    result.hp = result.hpMax;
    return result;
  }

  function getLightCone(name, lvl) {
    const base = data.lightCones[name];
    let result = {lvl: Math.floor(lvl), ...base};
    for (const x of ['hpMax', 'atk', 'def']) {
      result[x] = base[x] * (1 + ((result.lvl - 1) * 0.15));
      let i = countAscension(lvl);
      if (i-- > 0) result[x] += base[x] * 1.2;
      while (i-- > 0) result[x] += base[x] * 1.6;
    }
    return result;
  }

  function Button() {
    let result = document.createElement('span');
    result.className = 'button';
    return result;
  }

  function Dropdown(items) {
    let result = document.createElement('div');
    let state = false;

    let btn = Button();
    btn.addEventListener('click', () => {
      state = !state;
      render();
    });
    result.appendChild(btn);

    let menu = document.createElement('ul');
    menu.className = 'dropdown-menu';
    items.forEach((item) => {
      item.addEventListener('click', () => {
        state = false;
        render();
        result.dispatchEvent(new CustomEvent('lmn-select', {detail: {selection: item.dataset.value}}));
      });
      menu.appendChild(item);
    });
    result.appendChild(menu);

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
  let renderers = [];
  let state = new Proxy({
    character: null,
  }, {
    set(state, key, newValue) {
      state[key] = newValue;
      renderers.forEach((f) => f());
      return true;
    },
  });
  { // Character dropdown subcomponent.
    let characterDropdown = Dropdown((() => {
      let result = [];
      for (const name in data.characters) {
        let item = document.createElement('li');
        item.dataset.value = name;
        item.innerText = name;
        result.push(item);
      }
      return result;
    })());
    characterDropdown.button.innerText = 'Character';
    characterDropdown.addEventListener('lmn-select', (event) => {
      state.character = event.detail.selection;
      characterDropdown.button.innerText = event.detail.selection;
    });
    app.appendChild(characterDropdown);
  }
  { // Character panel subcomponent.
    let panel = document.createElement('ul');
    panel.className = 'panel';
    const render = () => {
      if (!state.character) return;
      panel.replaceChildren();
      let character = getCharacter(state.character, 80);
      for (const [name, value] of Object.entries(character)) {
        let item = document.createElement('li');
        let panelName = document.createElement('span');
        panelName.className = 'panel-name';
        panelName.innerText = name;
        item.appendChild(panelName);
        let panelValue = document.createElement('span');
        panelValue.className = 'panel-value';
        panelValue.innerText = value;
        item.appendChild(panelValue);
        panel.appendChild(item);
      }
    };
    renderers.push(render);
    app.appendChild(panel);
  }

  renderers.forEach((f) => f());
})();
