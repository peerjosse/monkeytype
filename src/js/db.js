const db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true });

let dbSnapshot = null;

export function db_getSnapshot() {
  return dbSnapshot;
}

export function db_setSnapshot(newSnapshot) {
  dbSnapshot = newSnapshot;
}

export async function db_getUserSnapshot() {
  let user = firebase.auth().currentUser;
  if (user == null) return false;
  let snap = {
    results: undefined,
    personalBests: {},
    tags: [],
    favouriteThemes: [],
    lbMemory: {
      time15: {
        global: null,
        daily: null,
      },
      time60: {
        global: null,
        daily: null,
      },
    },
  };
  try {
    await db
      .collection(`users/${user.uid}/tags/`)
      .get()
      .then((data) => {
        data.docs.forEach((doc) => {
          let tag = doc.data();
          tag.id = doc.id;
          snap.tags.push(tag);
        });
      })
      .catch((e) => {
        throw e;
      });
    await db
      .collection("users")
      .doc(user.uid)
      .get()
      .then((res) => {
        let data = res.data();
        if (data === undefined) return;
        if (data.personalBests !== undefined) {
          snap.personalBests = data.personalBests;
        }
        snap.discordId = data.discordId;
        snap.pairingCode =
          data.discordPairingCode == null ? undefined : data.discordPairingCode;
        snap.config = data.config;
        snap.favouriteThemes =
          data.favouriteThemes === undefined ? [] : data.favouriteThemes;
        snap.globalStats = {
          time: data.timeTyping,
          started: data.startedTests,
          completed: data.completedTests,
        };
        if (data.lbMemory !== undefined) {
          snap.lbMemory = data.lbMemory;
        }
      })
      .catch((e) => {
        throw e;
      });
    dbSnapshot = snap;
  } catch (e) {
    console.error(e);
  }
  return dbSnapshot;
}

export async function db_getUserResults() {
  let user = firebase.auth().currentUser;
  if (user == null) return false;
  if (dbSnapshot === null) return false;
  if (dbSnapshot.results !== undefined) {
    return true;
  } else {
    try {
      return await db
        .collection(`users/${user.uid}/results/`)
        .orderBy("timestamp", "desc")
        .limit(1000)
        .get()
        .then((data) => {
          dbSnapshot.results = [];
          data.docs.forEach((doc, index) => {
            let result = doc.data();
            result.id = doc.id;
            dbSnapshot.results.push(result);
          });
          return true;
        })
        .catch((e) => {
          throw e;
        });
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export async function db_getUserHighestWpm(
  mode,
  mode2,
  punctuation,
  language,
  difficulty
) {
  function cont() {
    let topWpm = 0;
    dbSnapshot.results.forEach((result) => {
      if (
        result.mode == mode &&
        result.mode2 == mode2 &&
        result.punctuation == punctuation &&
        result.language == language &&
        result.difficulty == difficulty
      ) {
        if (result.wpm > topWpm) {
          topWpm = result.wpm;
        }
      }
    });
    return topWpm;
  }

  let retval;
  if (dbSnapshot == null || dbSnapshot.results === undefined) {
    retval = 0;
  } else {
    retval = cont();
  }
  return retval;
}

export async function db_getLocalPB(
  mode,
  mode2,
  punctuation,
  language,
  difficulty
) {
  function cont() {
    let ret = 0;
    try {
      dbSnapshot.personalBests[mode][mode2].forEach((pb) => {
        if (
          pb.punctuation == punctuation &&
          pb.difficulty == difficulty &&
          pb.language == language
        ) {
          ret = pb.wpm;
        }
      });
      return ret;
    } catch (e) {
      return ret;
    }
  }

  let retval;
  if (dbSnapshot == null) {
  } else {
    retval = cont();
  }
  return retval;
}

export async function db_saveLocalPB(
  mode,
  mode2,
  punctuation,
  language,
  difficulty,
  wpm,
  acc,
  raw,
  consistency
) {
  function cont() {
    try {
      let found = false;
      if (dbSnapshot.personalBests[mode][mode2] === undefined) {
        dbSnapshot.personalBests[mode][mode2] = [];
      }
      dbSnapshot.personalBests[mode][mode2].forEach((pb) => {
        if (
          pb.punctuation == punctuation &&
          pb.difficulty == difficulty &&
          pb.language == language
        ) {
          found = true;
          pb.wpm = wpm;
          pb.acc = acc;
          pb.raw = raw;
          pb.timestamp = Date.now();
          pb.consistency = consistency;
        }
      });
      if (!found) {
        //nothing found
        dbSnapshot.personalBests[mode][mode2].push({
          language: language,
          difficulty: difficulty,
          punctuation: punctuation,
          wpm: wpm,
          acc: acc,
          raw: raw,
          timestamp: Date.now(),
          consistency: consistency,
        });
      }
    } catch (e) {
      //that mode or mode2 is not found
      dbSnapshot.personalBests[mode] = {};
      dbSnapshot.personalBests[mode][mode2] = [
        {
          language: language,
          difficulty: difficulty,
          punctuation: punctuation,
          wpm: wpm,
          acc: acc,
          raw: raw,
          timestamp: Date.now(),
          consistency: consistency,
        },
      ];
    }
  }

  if (dbSnapshot == null) {
  } else {
    cont();
  }
}
