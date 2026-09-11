import Icon from './Icon.jsx';

// Consistent stand-in visual for products/gallery items: a gradient panel
// with a line icon. This is a front-end prototype with no product
// photography available - honest placeholder art rather than pretending to
// be real photos. Swap for an <img> per item when real photography exists.
export default function PlaceholderArt({ icon, gradient = ['#123', '#001'], size = 56, aspect = '4 / 3' }) {
  return (
    <div
      className="placeholder-art"
      style={{
        aspectRatio: aspect,
        background: `linear-gradient(155deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      <Icon name={icon} size={size} />
    </div>
  );
}
