
import React, { useState, useEffect } from 'react';
import {Plus, Edit2, Trash2, Save, X, CreditCard} from 'lucide-react';
import { lumi } from '../lib/lumi';
import toast from 'react-hot-toast';

interface PaymentMethod {
  _id: string;
  name: string;
  value: string;
  active: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

const PaymentMethodsManagement: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    active: true,
    order: 0
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await lumi.entities.payment_methods.list({
        sort: { order: 1 },
        limit: 100
      });
      
      setPaymentMethods(response.list || []);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
      toast.error('Erro ao carregar formas de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.value.trim()) {
      toast.error('Preencha nome e valor');
      return;
    }

    try {
      const maxOrder = paymentMethods.length > 0 
        ? Math.max(...paymentMethods.map(p => p.order || 0)) 
        : 0;

      await lumi.entities.payment_methods.create({
        ...formData,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.success('Forma de pagamento adicionada!');
      setShowAddModal(false);
      setFormData({ name: '', value: '', active: true, order: 0 });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar forma de pagamento');
    }
  };

  const handleUpdate = async (id: string, data: Partial<PaymentMethod>) => {
    try {
      await lumi.entities.payment_methods.update(id, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      toast.success('Atualizado com sucesso!');
      setEditingId(null);
      fetchPaymentMethods();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir "${name}"?`)) return;

    try {
      await lumi.entities.payment_methods.delete(id);
      toast.success('Forma de pagamento excluída!');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  const toggleActive = async (method: PaymentMethod) => {
    await handleUpdate(method._id, { active: !method.active });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <CreditCard className="mr-3 text-blue-600" size={32} />
              Formas de Pagamento
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie as formas de pagamento disponíveis no cadastro de vendas
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nova Forma</span>
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhuma forma de pagamento cadastrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method._id}
                className={`border rounded-lg p-4 ${
                  method.active ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
                }`}
              >
                {editingId === method._id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={method.name}
                      onChange={(e) => {
                        const updated = paymentMethods.map(p =>
                          p._id === method._id ? { ...p, name: e.target.value } : p
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Nome da forma de pagamento"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1"
                      >
                        <X size={16} />
                        <span>Cancelar</span>
                      </button>
                      <button
                        onClick={() => handleUpdate(method._id, { name: method.name })}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Save size={16} />
                        <span>Salvar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={method.active}
                          onChange={() => toggleActive(method)}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${method.active ? 'text-gray-800' : 'text-gray-500'}`}>
                          {method.name}
                        </h3>
                        <p className="text-sm text-gray-500">Código: {method.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingId(method._id)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(method._id, method.name)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Nova Forma de Pagamento</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome (exibido para o usuário) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Cartão de Crédito"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código interno (sem espaços) *
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: cartao_credito"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', value: '', active: true, order: 0 });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsManagement;
