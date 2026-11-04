/** Remove obsolete presentation-only silhouette metadata on export, while
 * keeping the uploaded original and React state untouched. The Pixel Picture
 * renderer always chooses its picture from the generation seed.
 *
 * Both plain curriculum lessons and Review Studio session envelopes are
 * supported. Never modify other teacher-authored teaching/source fields.
 */
export function cleanReviewExport<T>(value:T):T{
 const next=structuredClone(value);
 const envelope=next as any;
 const lesson=envelope?.lesson?.schemaVersion===1?envelope.lesson:envelope;
 if(lesson?.schemaVersion===1&&lesson.preparedActivities?.pixelPicture&&
  typeof lesson.preparedActivities.pixelPicture==='object'&&
  !Array.isArray(lesson.preparedActivities.pixelPicture)){
  delete lesson.preparedActivities.pixelPicture.shapeId;
 }
 return next;
}
