/**
 * A challenge link must not land on a biography.
 *
 * The first version scrolled to the game after mount, and it was wrong twice
 * over: it raced the browser's own scroll restoration (measured overshooting
 * by 1,291px), and even when it landed it meant painting a hero nobody asked
 * for and then yanking it away.
 *
 * This hides the hero instead, from a blocking script that runs before first
 * paint. A seeded link renders the game at the top of the page with no scroll,
 * no flash and no layout shift, and the front door is untouched for everyone
 * else.
 */
export function ChallengeJump() {
  const script = `(function(){try{
    if(new URLSearchParams(location.search).has('seed')){
      document.documentElement.dataset.challenge='1';
      if('scrollRestoration' in history)history.scrollRestoration='manual';
    }
  }catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
