import React, { useCallback, useState } from "react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Modal, Form, Input, InputNumber, Button } from 'antd';
import { PlusOutlined } from "@ant-design/icons";
import { serializePubkey } from "../../utils/utils";
import { useMalloc } from "../../contexts/malloc";
import { BasketNode } from "../../models/malloc";

export interface CreateBasketModalProps {
  isVisible: boolean,
  onCancel: () => void,
  onOk: (node: BasketNode) => void,
}

export function CreateBasketModal(props: CreateBasketModalProps) {
  const [numSplits, setNumSplits] = useState(0)
  const { isVisible, onCancel, onOk } = props;

  const onFinish = (value: any) => {
    console.log(value);
    const { name, input, splits } = value.basket;
    const splitPct = splits.map(split => split.pct * 500);
    onOk({ name, input, splits: splitPct, calls: []});
  };

  return (
    <Modal title="New Basket" visible={isVisible} onCancel={onCancel}>
      <Form {...layout} name="create-basket" onFinish={onFinish} >
        <Form.Item name={['basket', 'name']} label="Basket name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name={['basket', 'input']} label="Basket input name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {
          [...Array(numSplits).keys()].map(i => (
            <Form.Item name={['basket', 'splits', `${i}`]} label={`Basket split ${i}`} rules={[{ required: true }]}>
              <InputNumber />
            </Form.Item>
          ))
        }
        <Button type="default" size="small" onClick={() => setNumSplits(numSplits+1)} icon={<PlusOutlined/>}/>
        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
          <Button type="primary" htmlType="submit">
            Ok
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

