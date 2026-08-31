let timeout;
function debouncedSync(stats) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log("Syncing to cloud...", stats);
    }, 2000);
}
debouncedSync({a: 1});
debouncedSync({a: 2});
