export const locateByPath = (startLevel, path) => {
    const splitID = path.split('.');
    let currentLevel = startLevel;

    for (let i = 0; i < splitID.length; i++) {
      const key = splitID[i];

      if (!currentLevel[key]) {
        currentLevel[key] = {};
      }

      currentLevel = currentLevel[key];
    }

    return currentLevel;
};

export const locateParentByPath = (startLevel, path) => {
    const splitID = path.split('.');
    let currentLevel = startLevel;

    for (let i = 0; i < splitID.length - 1; i++) {
      const key = splitID[i];

      if (!currentLevel[key]) {
        currentLevel[key] = {};
      }

      currentLevel = currentLevel[key];
    }

    return currentLevel;
};