export function AsyncOnClick() {
  async function save() {
    await Promise.resolve();
  }
  return <button type="button" onClick={async () => save()} />;
}
