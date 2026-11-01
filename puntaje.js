/* ==========================================================
   PUNTAJE DE LAS RULETAS (se puede editar)
   ok     = puntos por acertar
   mal    = puntos que se restan por fallar (número negativo)
   bonus  = extra máximo por responder rápido (solo Ruleta de preguntas;
            si respondes al instante ganas todo el bono, al final del tiempo, cero)
   parcial= puntos de una respuesta descriptiva medio correcta
   ========================================================== */
window.PUNTAJE = {
  vf:       { ok: 50,  mal: -25, bonus: 25 },   // Verdadero / Falso
  multiple: { ok: 100, mal: -30, bonus: 50 },   // Selección múltiple (única respuesta)
  desc:     { ok: 150, parcial: 75, mal: 0 }    // Descriptiva (la califica el profesor)
};
