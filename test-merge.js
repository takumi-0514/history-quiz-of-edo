function mergeStats(localStr, remoteObj) {
    let local = localStr ? JSON.parse(localStr) : {};
    let remote = remoteObj || {};
    let merged = { ...remote };
    for (const key in local) {
        if (!merged[key]) {
            merged[key] = local[key];
        } else {
            merged[key].correct = Math.max(merged[key].correct || 0, local[key].correct || 0);
            merged[key].wrong = Math.max(merged[key].wrong || 0, local[key].wrong || 0);
        }
    }
    return merged;
}
console.log(mergeStats('{"1":{"correct":2,"wrong":1}}', {"1":{"correct":1,"wrong":2}, "2":{"correct":5,"wrong":0}}));
