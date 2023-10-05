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
  let state = new Proxy(
    {
      character: {
        lvl: '',
        critRate: '',
        critDmg: '',
        path: '',
        type: '',
        hpMax: '',
        atk: '',
        def: '',
        spd: '',
        energy: '',
      },
    },
    {
      set(state, key, newValue) {
        state[key] = newValue;
        renderers.forEach((f) => f());
        return true;
      },
    },
  );
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
    characterDropdown.classList.add('character-dropdown');
    characterDropdown.button.innerText = 'Character';
    characterDropdown.addEventListener('lmn-select', (event) => {
      state.character = getCharacter(event.detail.selection, 80);
      characterDropdown.button.innerText = event.detail.selection;
    });
    app.appendChild(characterDropdown);
  }
  { // Character panel subcomponent.
    let panel = document.createElement('ul');
    panel.classList.add('panel');
    for (const name in state.character) {
      let item = document.createElement('li');
      let panelName = document.createElement('span');
      panelName.classList.add('panel-name');
      panelName.innerText = name;
      item.appendChild(panelName);
      let panelValue = document.createElement('span');
      panelValue.classList.add('panel-value');
      renderers.push(() => panelValue.innerText = state.character[name]);
      item.appendChild(panelValue);
      panel.appendChild(item);
    }
    app.appendChild(panel);
  }

  renderers.forEach((f) => f());
})();
