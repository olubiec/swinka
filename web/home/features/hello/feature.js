window.CuyHome.registerFeature({
  id: 'hello',
  title: 'Hello',
  icon: 'icon-clover',
  order: 999,
  open(container, api) {
    container.innerHTML = '<p>Hello world</p><button id="btnHelloPing">Ping</button>';
    document.getElementById('btnHelloPing').onclick = () => {
      api.send({ type: 'hello_ping' });
    };
  }
});
