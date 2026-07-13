'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [projectKeys, setProjectKeys] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'credentials' | 'projects'>('credentials');
  const [loading, setLoading] = useState(false);

  const [showCredForm, setShowCredForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newCredential, setNewCredential] = useState({
    network: '',
    email: '',
    password: '',
    notes: ''
  });

  const [newProject, setNewProject] = useState({
    project_name: '',
    db_password: '',
    anon_key: '',
    service_role_key: '',
    extra_notes: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: creds } = await supabase.from('credentials').select('*').eq('user_id', user.id);
      const { data: keys } = await supabase.from('project_keys').select('*').eq('user_id', user.id);
      
      setCredentials(creds || []);
      setProjectKeys(keys || []);
    }
  };

  const addCredential = async () => {
    if (!newCredential.network || !newCredential.email || !user) return;
    setLoading(true);

    const { error } = await supabase.from('credentials').insert({
      user_id: user.id,
      network: newCredential.network,
      email: newCredential.email,
      password_ciphertext: newCredential.password,
      password_iv: 'temp-iv',
      notes_ciphertext: newCredential.notes,
      notes_iv: 'temp-iv'
    });

    if (!error) {
      setShowCredForm(false);
      setNewCredential({ network: '', email: '', password: '', notes: '' });
      fetchData();
    }
    setLoading(false);
  };

  const addProjectKey = async () => {
    if (!newProject.project_name || !user) return;
    setLoading(true);

    const { error } = await supabase.from('project_keys').insert({
      user_id: user.id,
      project_name: newProject.project_name,
      db_password_ciphertext: newProject.db_password,
      db_password_iv: 'temp-iv',
      anon_key_ciphertext: newProject.anon_key,
      anon_key_iv: 'temp-iv',
      service_role_key_ciphertext: newProject.service_role_key,
      service_role_key_iv: 'temp-iv',
      extra_notes_ciphertext: newProject.extra_notes,
      extra_notes_iv: 'temp-iv'
    });

    if (!error) {
      setShowProjectForm(false);
      setNewProject({ project_name: '', db_password: '', anon_key: '', service_role_key: '', extra_notes: '' });
      fetchData();
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-72 bg-white border-r shadow-sm p-6 flex flex-col">
        <h1 className="text-3xl font-bold text-blue-700 mb-10">B-Veda</h1>
        
        <nav className="space-y-1 flex-1">
          <button onClick={() => setActiveTab('credentials')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'credentials' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
            🔑 Credenciales
          </button>
          <button onClick={() => setActiveTab('projects')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'projects' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
            🗝️ Project Keys
          </button>
        </nav>

        <div className="pt-6 border-t text-sm text-gray-600">
          {user?.email}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-semibold">
            {activeTab === 'credentials' ? 'Credenciales' : 'Llaves de Proyectos'}
          </h2>
          <button onClick={() => activeTab === 'credentials' ? setShowCredForm(true) : setShowProjectForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700">
            + Nuevo
          </button>
        </div>

        {activeTab === 'credentials' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-5">Servicio</th>
                  <th className="text-left p-5">Email</th>
                  <th className="text-left p-5">Contraseña</th>
                  <th className="text-left p-5">Notas</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-5 font-medium">{c.network}</td>
                    <td className="p-5">{c.email}</td>
                    <td className="p-5 text-gray-500">••••••••</td>
                    <td className="p-5 text-gray-600">{c.notes_ciphertext ? 'Encriptado' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-5">Proyecto</th>
                  <th className="text-left p-5">DB Password</th>
                  <th className="text-left p-5">Anon Key</th>
                  <th className="text-left p-5">Service Role</th>
                </tr>
              </thead>
              <tbody>
                {projectKeys.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-5 font-medium">{p.project_name}</td>
                    <td className="p-5 text-gray-500">••••••</td>
                    <td className="p-5 text-gray-500">••••••</td>
                    <td className="p-5 text-gray-500">••••••</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales (mismos de antes) */}
      {showCredForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-96 max-h-[90vh] overflow-auto">
            <h3 className="text-2xl mb-6">Nueva Credencial</h3>
            <input placeholder="Servicio" className="w-full border p-3 rounded mb-3" value={newCredential.network} onChange={e => setNewCredential({...newCredential, network: e.target.value})} />
            <input placeholder="Email" className="w-full border p-3 rounded mb-3" value={newCredential.email} onChange={e => setNewCredential({...newCredential, email: e.target.value})} />
            <input placeholder="Contraseña" type="password" className="w-full border p-3 rounded mb-3" value={newCredential.password} onChange={e => setNewCredential({...newCredential, password: e.target.value})} />
            <textarea placeholder="Notas" className="w-full border p-3 rounded mb-6" value={newCredential.notes} onChange={e => setNewCredential({...newCredential, notes: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setShowCredForm(false)} className="flex-1 py-3 border rounded-xl">Cancelar</button>
              <button onClick={addCredential} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-96">
            <h3 className="text-2xl mb-6">Nuevo Proyecto</h3>
            <input placeholder="Nombre del Proyecto" className="w-full border p-3 rounded mb-3" value={newProject.project_name} onChange={e => setNewProject({...newProject, project_name: e.target.value})} />
            <input placeholder="DB Password" className="w-full border p-3 rounded mb-3" value={newProject.db_password} onChange={e => setNewProject({...newProject, db_password: e.target.value})} />
            <input placeholder="Anon Key" className="w-full border p-3 rounded mb-3" value={newProject.anon_key} onChange={e => setNewProject({...newProject, anon_key: e.target.value})} />
            <input placeholder="Service Role Key" className="w-full border p-3 rounded mb-6" value={newProject.service_role_key} onChange={e => setNewProject({...newProject, service_role_key: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setShowProjectForm(false)} className="flex-1 py-3 border rounded-xl">Cancelar</button>
              <button onClick={addProjectKey} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}