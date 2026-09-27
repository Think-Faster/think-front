import logo from './logo.png';
import './App.css';
import LogsPage from './funnel/LogsPage';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="Think Faster" />
        <nav className="App-nav">
          <span className="App-nav__item is-active">Логи</span>
        </nav>
      </header>
      <main>
        <LogsPage />
      </main>
    </div>
  );
}

export default App;
