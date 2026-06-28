import { Switch, Route } from 'wouter';
import Home from './pages/Home';
import Organizer from './pages/Organizer';
import NotFound from './pages/not-found';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/organizer" component={Organizer} />
      <Route component={NotFound} />
    </Switch>
  );
}
