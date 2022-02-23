import { useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  useEffect(() => {
    axios
      .get('/api/posts')
      .then(res => {
        console.log(res.data);
      });
  })

  return (
    <div className="app">
      <h1>Welcome to our fancy blog!</h1>
      <p>We've been waiting for you!</p>
    </div>
  );
}

export default App;
