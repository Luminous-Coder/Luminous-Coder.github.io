(async () => {
  const BASE_URL = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';
  const LANG = 'cht';

  function countAscension(lvl) {
    return Math.ceil((lvl - 20) / 10);
  }

  async function getCharacter(id, lvl) {
    const response = await fetch(`${BASE_URL}/index_min/${LANG}/character_promotions.json`);
    const data = await response.json();
    let result = data[id].values[countAscension(lvl)];
    for (const key in result) {
      result[key] = result[key].base + result[key].step * Math.floor(lvl - 1);
    }
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
        result.dispatchEvent(new CustomEvent('lmn-select', {detail: {selection: item.dataset.value}}));
      });
      menu.appendChild(item);
    });
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
      character: null,
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
    const response = await fetch(`${BASE_URL}/index_min/${LANG}/characters.json`);
    const data = await response.json();
    let characterDropdown = Dropdown((() => {
      let result = [];
      for (const x of Object.values(data)) {
        let item = document.createElement('li');
        item.dataset.value = x.id;
        item.innerText = x.name;
        result.push(item);
      }
      return result;
    })());
    characterDropdown.classList.add('character-dropdown');
    characterDropdown.addEventListener('lmn-select', async (event) => {
      state.character = await getCharacter(event.detail.selection, 80);
      characterDropdown.button.innerText = data[event.detail.selection].name;
    });
    characterDropdown.setSelection(1001);
    app.appendChild(characterDropdown);
  }
  { // Character panel subcomponent.
    let panel = document.createElement('ul');
    panel.classList.add('panel');
    renderers.push(() => {
      panel.replaceChildren();
      for (const key in state.character) {
        let item = document.createElement('li');
        let panelName = document.createElement('span');
        panelName.classList.add('panel-name');
        panelName.innerText = key;
        item.appendChild(panelName);
        let panelValue = document.createElement('span');
        panelValue.classList.add('panel-value');
        panelValue.innerText = state.character[key];
        item.appendChild(panelValue);
        panel.appendChild(item);
      }
    });
    app.appendChild(panel);
  }

  renderers.forEach((f) => f());
})();
