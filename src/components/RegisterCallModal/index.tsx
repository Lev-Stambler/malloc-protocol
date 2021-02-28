import React, { useCallback } from "react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Modal, Form, Input, Button } from 'antd';
import { serializePubkey } from "../../utils/utils";
import { useMalloc } from "../../contexts/malloc";

export interface RegisterCallModalProps {
  isVisible: boolean,
  onCancel: () => void,
  onOk: () => void,
}

export function RegisterCallModal(props: RegisterCallModalProps) {
  const malloc = useMalloc();
  const { isVisible, onCancel, onOk } = props;

  const onFinish = useCallback(async (value: any) => {
    console.log(value);
    const { name, progId, input } = value.call;
    /*
    const insns: TransactionInstruction[] = [];
    insns.push(malloc.registerCall({
      call_name: name,
      wcall: {
        Simple: {
          wcall: serializePubkey(new PublicKey(progId)),
          input: input,
          associated_accounts: []
        }
      },
    }));
    await malloc.sendMallocTransaction(insns, []);
    */
  }, [malloc]);

  return (
    <Modal title="New Call" visible={isVisible} onOk={onOk} onCancel={onCancel}>
      <Form {...layout} name="register-call" onFinish={onFinish} >
        <Form.Item name={['call', 'name']} label="Call name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name={['call', 'input']} label="Call input name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name={['call', 'progId']} label="Call program ID" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name={['call', 'description']} label="Call description" rules={[{ required: true }]}>
          <Input.TextArea />
        </Form.Item>
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

