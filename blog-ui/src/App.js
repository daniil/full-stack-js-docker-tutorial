import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const Post = ({ post }) => {
  return (
    <article className="post">
      <h2>{post.title}</h2>
      <p>{post.body}</p>
    </article>
  )
}

const CreatePost = ({ onPost }) => {
  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .post('/api/posts', {
        title: e.target.title.value,
        body: e.target.body.value
      })
      .then(() => {
        onPost();
        e.target.reset();
      });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-input">
        <label htmlFor="title">Title:</label>
        <input type="text" id="title" name="title" />
      </div>
      <div className="form-input">
        <label htmlFor="body">Text:</label>
        <textarea id="body" name="body" />
      </div>
      <div>
        <button type="submit">Create New Post</button>
      </div>
    </form>
  )
}

const App = () => {
  const [posts, setPosts] = useState([]);

  const fetchPosts = () => {
    axios
      .get('/api/posts')
      .then(res => {
        setPosts(res.data);
      });
  }

  useEffect(() => {
    fetchPosts();
  }, [])

  return (
    <div className="app">
      <h1>Welcome to our fancy blog!</h1>
      <p>We've been waiting for you!</p>
      <div className="post-container">
        <section className="posts">
          {!posts.length && <p>No posts yet, why don't create new one!</p>}
          {posts.map(post => {
            return (
              <Post key={post.id} post={post}/>
            )
          })}
        </section>
        <CreatePost onPost={fetchPosts}/>
      </div>
    </div>
  );
}

export default App;
