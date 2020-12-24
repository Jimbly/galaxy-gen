// Derived from (MIT Licensed) https://github.com/uber-web/loaders.gl/tree/master/modules/gltf

const assert = require('assert');

const {
  ATTRIBUTE_TYPE_TO_COMPONENTS,
  ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE,
  ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY
} = require('./gltf-type-utils.js');

// Creates a new ArrayBuffer starting at the offset, containing all remaining bytes
// TODO - should not be needed, see above
function getArrayBufferAtOffset(arrayBuffer, byteOffset) {
  const length = arrayBuffer.byteLength - byteOffset;
  const binaryBuffer = new ArrayBuffer(length);
  const sourceArray = new Uint8Array(arrayBuffer);
  const binaryArray = new Uint8Array(binaryBuffer);
  for (let i = 0; i < length; i++) {
    binaryArray[i] = sourceArray[byteOffset + i];
  }
  return binaryBuffer;
}

function getArrayTypeAndLength(accessor, bufferView) {
  const ArrayType = ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY[accessor.componentType];
  const components = ATTRIBUTE_TYPE_TO_COMPONENTS[accessor.type];
  const bytesPerComponent = ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE[accessor.componentType];
  const length = accessor.count * components;
  const byteLength = accessor.count * components * bytesPerComponent;
  assert(byteLength >= 0 && byteLength <= bufferView.byteLength);
  return { ArrayType, length, byteLength };
}

function unpackAccessors(arrayBuffer, bufferViews, json) {
  // unpack accessors
  const accessors = json.accessors || [];

  const accessorBuffers = [];

  for (let i = 0; i < accessors.length; ++i) {
    const accessor = accessors[i];
    assert(accessor);

    const bufferView = bufferViews[accessor.bufferView];
    // Draco encoded meshes don't have bufferView in accessor
    if (bufferView) {
      // Create a new typed array as a view into the combined buffer
      const { ArrayType, length } = getArrayTypeAndLength(accessor, bufferView);
      const array = new ArrayType(arrayBuffer, bufferView.byteOffset, length);
      // Store the metadata on the array (e.g. needed to determine number of components per element)
      array.accessor = accessor;
      accessorBuffers.push(array);
    }
  }

  return accessorBuffers;
}

function unpackImages(arrayBuffer, bufferViews, json) {
  // unpack images
  const images = json.images || [];

  const imageBuffers = [];

  for (let i = 0; i < images.length; ++i) {
    const image = images[i];
    assert(image);

    if (image.bufferView === undefined) {
      imageBuffers.push(null);
      continue;
    }

    const bufferView = bufferViews[image.bufferView];
    assert(bufferView);

    // Create a new typed array as a view into the combined buffer
    const array = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
    // Store the metadata on the array (e.g. needed to determine number of components per element)
    array.imate = image;
    imageBuffers.push(array);
  }

  return imageBuffers;
}

export function unpackGLBBuffers(arrayBuffer, json, binaryByteOffset) {
  // TODO - really inefficient, should just use the offset into the original array buffer
  if (binaryByteOffset) {
    arrayBuffer = getArrayBufferAtOffset(arrayBuffer, binaryByteOffset);
  }

  const bufferViews = json.bufferViews || [];

  for (let i = 0; i < bufferViews.length; ++i) {
    const bufferView = bufferViews[i];
    assert(bufferView.byteLength >= 0);
  }

  return {
    // TODO: delete unpackAccessors and use buffer views only?
    accessors: unpackAccessors(arrayBuffer, bufferViews, json),
    images: unpackImages(arrayBuffer, bufferViews, json)
  };
}
