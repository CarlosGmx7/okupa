import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaBogota, franjaDe, franjasPendientes, textoDe, vencido, destinatarios, quiereRecordatorio, fechaEnZona, momentoDeFranja } from './logica.mjs';

test('franjaDe redondea hacia abajo a 15 min en UTC', () => {
  assert.equal(franjaDe(new Date('2026-11-13T01:07:00Z')), '01:00');
  assert.equal(franjaDe(new Date('2026-11-13T23:59:59Z')), '23:45');
  assert.equal(franjaDe(new Date('2026-11-13T00:15:00Z')), '00:15');
});

test('franjasPendientes: las saltadas desde la última, máximo 8', () => {
  const r = franjasPendientes('2026-11-13T00:30:00.000Z', new Date('2026-11-13T01:20:00Z'));
  assert.deepEqual(r.franjas, ['00:45', '01:00', '01:15']);
  assert.equal(r.nuevaUltima, '2026-11-13T01:15:00.000Z');
  assert.equal(franjasPendientes('2026-11-12T20:00:00.000Z', new Date('2026-11-13T01:20:00Z')).franjas.length, 8);
  assert.deepEqual(franjasPendientes(null, new Date('2026-11-13T01:20:00Z')).franjas, ['01:15']);
  assert.deepEqual(franjasPendientes('2026-11-13T01:15:00.000Z', new Date('2026-11-13T01:20:00Z')).franjas, []);
});

test('fechaBogota usa la fecha de Colombia', () => {
  assert.equal(fechaBogota(new Date('2026-11-14T03:00:00Z')), '2026-11-13');
  assert.equal(fechaBogota(new Date('2026-11-14T06:00:00Z')), '2026-11-14');
});

test('textoDe arma los textos sin detalles', () => {
  assert.deepEqual(textoDe('trivia', 'Yuli'), { titulo: 'Yuli te invitó a la Trivia', texto: 'Te está esperando para jugar.', ruta: '#/trivia' });
  assert.deepEqual(textoDe('diario', null), { titulo: 'Tu pareja respondió el Diario', texto: 'Entra a ver qué respondieron.', ruta: '#/diario' });
  assert.deepEqual(textoDe('mapa', 'Carlos'), { titulo: 'Carlos agregó algo al mapa', texto: 'Entra a verlo.', ruta: '#/mapa' });
  assert.deepEqual(textoDe('recordatorio'), { titulo: '¿Ya respondiste el Diario?', texto: 'Te falta tu parte de hoy.', ruta: '#/diario' });
  assert.equal(textoDe('otro', 'X'), null);
});

test('vencido: 24 h en general, 30 min la trivia', () => {
  const t = Date.parse('2026-11-13T00:00:00Z');
  assert.equal(vencido('trivia', t, t + 31 * 60e3), true);
  assert.equal(vencido('trivia', t, t + 29 * 60e3), false);
  assert.equal(vencido('diario', t, t + 23 * 3600e3), false);
  assert.equal(vencido('mapa', t, t + 25 * 3600e3), true);
});

test('destinatarios: los demás del grupo con ese aviso encendido; registros viejos son inválidos', () => {
  const avisos = { diario: true, trivia: true, mapa: true, recordatorio: true };
  const dispositivos = [
    { id: 'da', datos: { uid: 'u1', lugar: 'a', token: 'ta', avisos } },
    { id: 'db', datos: { uid: 'u2', lugar: 'b', token: 'tb', avisos: { ...avisos, mapa: false } } },
    { id: 'viejo', datos: { uid: 'u9', lugar: 'b', token: 'tv', avisos } },
  ];
  const pareja = { lugares: { a: 'u1', b: 'u2' } };
  assert.deepEqual(destinatarios(dispositivos, pareja, { tipo: 'mapa', de: 'a' }), { enviar: [], invalidos: ['viejo'] });
  assert.deepEqual(destinatarios(dispositivos, pareja, { tipo: 'diario', de: 'a' }), { enviar: [{ id: 'db', token: 'tb' }], invalidos: ['viejo'] });
  assert.deepEqual(destinatarios(dispositivos, pareja, { tipo: 'diario', de: 'b' }).enviar, [{ id: 'da', token: 'ta' }]);
});

test('quiereRecordatorio: solo si está encendido, no se mandó hoy y no ha respondido', () => {
  const d = { avisos: { recordatorio: true }, ultimoRecordatorio: '2026-11-12' };
  assert.equal(quiereRecordatorio(d, '2026-11-13', false), true);
  assert.equal(quiereRecordatorio({ ...d, ultimoRecordatorio: '2026-11-13' }, '2026-11-13', false), false);
  assert.equal(quiereRecordatorio(d, '2026-11-13', true), false);
  assert.equal(quiereRecordatorio({ ...d, avisos: { recordatorio: false } }, '2026-11-13', false), false);
});

test('fechaEnZona da la fecha local de la zona', () => {
  assert.equal(fechaEnZona(new Date('2026-03-10T03:00:00Z'), 'America/Bogota'), '2026-03-09');
  assert.equal(fechaEnZona(new Date('2026-03-10T13:00:00Z'), 'America/Bogota'), '2026-03-10');
});

test('momentoDeFranja: la franja más reciente con esa hora UTC', () => {
  assert.equal(momentoDeFranja('13:00', new Date('2026-03-10T13:05:00Z')).toISOString(), '2026-03-10T13:00:00.000Z');
  assert.equal(momentoDeFranja('23:45', new Date('2026-03-11T00:10:00Z')).toISOString(), '2026-03-10T23:45:00.000Z');
});