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
      result[x] = base[x] * (1 + ((result.lvl)));
    }
  }

  for (const elm of document.getElementsByClassName('character')) { // Character component.
    let renderers = [];
    const setState = (update) => {
      update();
      renderers.forEach((f) => f());
    };

    let state = {
      character: null,
    };

    { // Character selection subcomponent.
      const characterSelect = elm.getElementsByClassName('character-select')[0];
      let characterSelectState = false;
      const [btn, menu] = characterSelect.children;
      btn.addEventListener('click', () => setState(() => {
        characterSelectState = !characterSelectState;
      }));
      renderers.push(() => btn.innerText = state.character ?? 'Character');
      for (const character in data.characters) {
        const item = document.createElement('li');
        item.innerText = character;
        item.dataset.value = character;
        item.addEventListener('click', () => {
          setState(() => state.character = item.dataset.value);
          setState(() => characterSelectState = false);
        });
        menu.appendChild(item);
      }
      renderers.push(() => menu.hidden = !characterSelectState);
    }

    { // Character panel subcomponent.
      const panel = elm.getElementsByClassName('character-panel')[0];
      renderers.push(() => {
        if (!state.character) return;
        const character = getCharacter(state.character, 80);
        panel.getElementsByClassName('hp')[0].innerText = character.hpMax;
        panel.getElementsByClassName('atk')[0].innerText = character.atk;
        panel.getElementsByClassName('def')[0].innerText = character.def;
        panel.getElementsByClassName('spd')[0].innerText = character.spd;
      });
    }

    renderers.forEach((f) => f());
  }
})();
