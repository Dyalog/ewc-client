// Import only for side-effects
if (!URL.parse) {
  URL.parse = function(url) {
    try {
      return new URL(url);
    } catch (e) {
      throw new Error('Invalid URL');
    }
  };
}

export default {};
